// ============================================================
// DATABASE OPERATIONS MODULE
// Trường THCS-THPT Trần Trường Sinh
// ============================================================

/**
 * Get all meetings for a team
 * @param {string} teamId - Team ID
 * @returns {Promise<Array>}
 */
async function getMeetingsByTeam(teamId) {
    try {
        const snapshot = await db.ref('meetings')
            .orderByChild('teamId')
            .equalTo(teamId)
            .once('value');
        const data = snapshot.val();
        if (!data) return [];
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    } catch (error) {
        console.error('Error getting meetings:', error);
        return [];
    }
}

/**
 * Get all meetings (admin only)
 * @returns {Promise<Array>}
 */
async function getAllMeetings() {
    try {
        const snapshot = await db.ref('meetings').once('value');
        const data = snapshot.val();
        if (!data) return [];
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    } catch (error) {
        console.error('Error getting all meetings:', error);
        return [];
    }
}

/**
 * Get a single meeting by ID
 * @param {string} meetingId
 * @returns {Promise<Object|null>}
 */
async function getMeeting(meetingId) {
    try {
        const snapshot = await db.ref(`meetings/${meetingId}`).once('value');
        const data = snapshot.val();
        if (!data) return null;
        return { id: meetingId, ...data };
    } catch (error) {
        console.error('Error getting meeting:', error);
        return null;
    }
}

/**
 * Check if a meeting is closed
 * @param {string} meetingId
 * @returns {Promise<boolean>}
 */
async function isMeetingClosed(meetingId) {
    try {
        const snapshot = await db.ref(`meetings/${meetingId}/status`).once('value');
        return snapshot.val() === 'CLOSED';
    } catch (error) {
        console.error('Error checking meeting status:', error);
        return false;
    }
}

/**
 * Create a new meeting
 * @param {Object} meetingData
 * @returns {Promise<string>} Meeting ID
 */
async function createMeeting(meetingData) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    const meetingRef = db.ref('meetings').push();
    const meetingId = meetingRef.key;
    
    const now = firebase.database.ServerValue.TIMESTAMP;
    const data = {
        ...meetingData,
        status: 'DRAFT',
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
        viewedBy: {
            [uid]: now
        }
    };
    
    await meetingRef.set(data);
    
    await logActivity(meetingId, uid, 'CREATE_MEETING', 'MEETING', meetingId, `Đã tạo cuộc họp "${meetingData.title}"`);
    
    return meetingId;
}

/**
 * Update a meeting (with CLOSED check)
 * @param {string} meetingId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
async function updateMeeting(meetingId, updates) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể sửa cuộc họp đã chốt');
    }
    
    await db.ref(`meetings/${meetingId}`).update({
        ...updates,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    await logActivity(meetingId, uid, 'UPDATE_MEETING', 'MEETING', meetingId, `Cập nhật cuộc họp`);
}

/**
 * Update meeting status
 * @param {string} meetingId
 * @param {string} status - DRAFT|DISCUSSION|CONCLUDED|CONFIRMATION|CLOSED
 * @returns {Promise<void>}
 */
async function updateMeetingStatus(meetingId, status) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    const updates = {
        status: status,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    if (status === 'CLOSED') {
        updates.closedAt = firebase.database.ServerValue.TIMESTAMP;
        updates.closedBy = uid;
    }
    
    await db.ref(`meetings/${meetingId}`).update(updates);
    
    if (status !== 'CLOSED') {
        await logActivity(meetingId, uid, `STATUS_${status}`, 'MEETING', meetingId, `Cập nhật trạng thái: ${status}`);
    }
}

/**
 * Record user viewed meeting
 * @param {string} meetingId
 * @param {string} uid - User ID
 */
async function recordMeetingView(meetingId, uid) {
    try {
        await db.ref(`meetings/${meetingId}/viewedBy/${uid}`).set(firebase.database.ServerValue.TIMESTAMP);
    } catch (error) {
        console.error('Error recording view:', error);
    }
}

/**
 * Get contents of a meeting
 * @param {string} meetingId
 * @returns {Promise<Array>}
 */
async function getMeetingContents(meetingId) {
    try {
        const snapshot = await db.ref(`meetingContents/${meetingId}`).once('value');
        const data = snapshot.val();
        if (!data) return [];
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    } catch (error) {
        console.error('Error getting meeting contents:', error);
        return [];
    }
}

/**
 * Add content to a meeting (with CLOSED check)
 * @param {string} meetingId
 * @param {Object} contentData
 * @returns {Promise<string>} Content ID
 */
async function addMeetingContent(meetingId, contentData) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể thêm nội dung vào cuộc họp đã chốt');
    }
    
    const contentRef = db.ref(`meetingContents/${meetingId}`).push();
    const contentId = contentRef.key;
    
    const now = firebase.database.ServerValue.TIMESTAMP;
    const data = {
        ...contentData,
        status: 'DRAFT',
        createdBy: uid,
        createdAt: now,
        updatedAt: now
    };
    
    await contentRef.set(data);
    
    await logActivity(meetingId, uid, 'ADD_CONTENT', 'CONTENT', contentId, `Đã thêm nội dung "${contentData.title}"`);
    
    return contentId;
}

/**
 * Update meeting content (with CLOSED check)
 * @param {string} meetingId
 * @param {string} contentId
 * @param {Object} updates
 */
async function updateMeetingContent(meetingId, contentId, updates) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể sửa nội dung của cuộc họp đã chốt');
    }
    
    await db.ref(`meetingContents/${meetingId}/${contentId}`).update({
        ...updates,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
}

/**
 * Get discussions for a meeting
 * @param {string} meetingId
 * @param {string} contentId - Optional filter by content
 * @returns {Promise<Array>}
 */
async function getDiscussions(meetingId, contentId = null) {
    try {
        const snapshot = await db.ref(`discussions/${meetingId}`).once('value');
        const data = snapshot.val();
        if (!data) return [];
        
        let discussions = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
        
        if (contentId) {
            discussions = discussions.filter(d => d.contentId === contentId);
        }
        
        discussions.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        
        return discussions;
    } catch (error) {
        console.error('Error getting discussions:', error);
        return [];
    }
}

/**
 * Add a discussion (with CLOSED check)
 * Đã bổ sung: tăng discussionCount ở cả meeting (tổng) lẫn content (riêng)
 * @param {string} meetingId
 * @param {Object} discussionData
 * @returns {Promise<string>} Discussion ID
 */
async function addDiscussion(meetingId, discussionData) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể thảo luận trong cuộc họp đã chốt');
    }
    
    const userData = await getCurrentUserData();
    const userName = userData?.displayName || getCurrentUserName() || 'Người dùng';
    
    const discRef = db.ref(`discussions/${meetingId}`).push();
    const discId = discRef.key;
    
    const now = firebase.database.ServerValue.TIMESTAMP;
    const data = {
        ...discussionData,
        authorId: uid,
        authorName: userName,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        attachments: discussionData.attachments || {}
    };
    
    await discRef.set(data);
    
    try {
        await db.ref(`meetings/${meetingId}/discussionCount`).transaction(function(currentCount) {
            return (currentCount || 0) + 1;
        });
    } catch (countError) {
        console.warn('Không cập nhật được discussionCount tổng:', countError);
    }
    
    if (discussionData.contentId) {
        try {
            await db.ref(`meetingContents/${meetingId}/${discussionData.contentId}/discussionCount`)
                .transaction(function(currentCount) {
                    return (currentCount || 0) + 1;
                });
        } catch (countError) {
            console.warn('Không cập nhật được discussionCount của content:', countError);
        }
    }
    
    await logActivity(
        meetingId,
        uid,
        'CREATE_DISCUSSION',
        'DISCUSSION',
        discId,
        `Đã gửi ý kiến: "${truncateText(discussionData.content, 50)}"`
    );
    
    return discId;
}

/**
 * Update a discussion (with CLOSED check)
 * @param {string} meetingId
 * @param {string} discussionId
 * @param {Object} updates
 */
async function updateDiscussion(meetingId, discussionId, updates) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể sửa ý kiến trong cuộc họp đã chốt');
    }
    
    const snapshot = await db.ref(`discussions/${meetingId}/${discussionId}`).once('value');
    const current = snapshot.val();
    if (!current) throw new Error('Không tìm thấy ý kiến');
    if (current.authorId !== uid && !await isAdmin()) {
        throw new Error('Bạn không có quyền sửa ý kiến này');
    }
    
    if (updates.content && current.content !== updates.content) {
        const historyRef = db.ref(`discussions/${meetingId}/${discussionId}/editHistory`).push();
        await historyRef.set({
            previousContent: current.content,
            newContent: updates.content,
            editedAt: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    await db.ref(`discussions/${meetingId}/${discussionId}`).update({
        ...updates,
        status: 'EDITED',
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
}
/**
 * Xóa một ý kiến thảo luận
 * CHỈ cho phép: tác giả HOẶC admin HOẶC ban lãnh đạo cuộc họp xóa
 * Không cho xóa khi meeting đã CLOSED
 * @param {string} meetingId
 * @param {string} discussionId
 * @returns {Promise<void>}
 */
async function removeDiscussion(meetingId, discussionId) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể xóa ý kiến trong cuộc họp đã chốt');
    }
    
    const snapshot = await db.ref(`discussions/${meetingId}/${discussionId}`).once('value');
    const current = snapshot.val();
    if (!current) throw new Error('Không tìm thấy ý kiến');
    
    const isAuthor = current.authorId === uid;
    const isAdm = await isAdmin();
    const role = await getCurrentUserRole();
    const isLeader = role === 'truong_to' || role === 'to_pho' || role === 'nhom_truong';
    
    if (!isAuthor && !isAdm && !isLeader) {
        throw new Error('Bạn không có quyền xóa ý kiến này');
    }
    
    const allSnap = await db.ref(`discussions/${meetingId}`).once('value');
    const allData = allSnap.val() || {};
    const childReplies = Object.keys(allData).filter(k => allData[k].parentId === discussionId);
    const totalToDelete = 1 + childReplies.length;
    
    const updates = {};
    updates[`discussions/${meetingId}/${discussionId}`] = null;
    childReplies.forEach(childId => {
        updates[`discussions/${meetingId}/${childId}`] = null;
    });
    await db.ref().update(updates);
    
    try {
        await db.ref(`meetings/${meetingId}/discussionCount`).transaction(function(c) {
            const newVal = (c || 0) - totalToDelete;
            return newVal < 0 ? 0 : newVal;
        });
    } catch (e) {
        console.warn('Không cập nhật được discussionCount tổng:', e);
    }
    
    if (current.contentId) {
        try {
            await db.ref(`meetingContents/${meetingId}/${current.contentId}/discussionCount`)
                .transaction(function(c) {
                    const newVal = (c || 0) - totalToDelete;
                    return newVal < 0 ? 0 : newVal;
                });
        } catch (e) {
            console.warn('Không cập nhật được discussionCount của content:', e);
        }
    }
    
    try {
        await logActivity(
            meetingId, uid, 'DELETE_DISCUSSION', 'DISCUSSION', discussionId,
            `Đã xóa ý kiến: "${truncateText(current.content || '', 50)}"`
        );
    } catch (e) {
        console.warn('Không ghi được activity log:', e);
    }
}
/**
 * Get tasks for a meeting
 * ĐÃ NÂNG CẤP: Trả về assignedTo dưới dạng object map + resolve danh sách tên
 * @param {string} meetingId
 * @param {string} assignedToUid - Optional filter by user (kiểm tra uid nằm trong map)
 * @returns {Promise<Array>}
 */
async function getTasks(meetingId, assignedToUid = null) {
    try {
        const snapshot = await db.ref(`tasks/${meetingId}`).once('value');
        const data = snapshot.val();
        if (!data) return [];
        
        let tasks = Object.keys(data).map(key => ({
            ...data[key],
            id: key,
            meetingId: meetingId
        }));
        
        // Nếu filter theo uid, kiểm tra uid có nằm trong assignedTo object map
        if (assignedToUid) {
            tasks = tasks.filter(t => {
                if (!t.assignedTo) return false;
                if (typeof t.assignedTo === 'string') {
                    // Legacy format cũ: string uid
                    return t.assignedTo === assignedToUid;
                }
                // Format mới: object map
                return t.assignedTo[assignedToUid] === true || t.assignedTo['__ALL__'] === true;
            });
        }
        
        return tasks;
    } catch (error) {
        if (error.code === 'PERMISSION_DENIED'
            || (error.message && error.message.includes('permission_denied'))) {
            console.warn(`⚠️ Không có quyền đọc tasks của meeting ${meetingId} — bỏ qua.`);
            return [];
        }
        console.error('Error getting tasks:', error);
        return [];
    }
}

/**
 * Lấy tất cả nhiệm vụ được giao cho một user
 * Đã nâng cấp:
 *   - CHỈ đọc tasks từ những meetings mà user có quyền truy cập
 *   - Dùng getMeetingsForUser cho non-admin để bao gồm cả meetings khách mời
 *   - Bọc try/catch từng meeting để tránh 1 meeting lỗi làm hỏng toàn bộ
 * @param {string} uid
 * @returns {Promise<Array>}
 */
async function getAllUserTasks(uid) {
    try {
        const role = await getCurrentUserRole();
        const teamId = await getCurrentUserTeamId();
        
        let accessibleMeetings = [];
        
        if (role === 'admin') {
            accessibleMeetings = await getAllMeetings();
        } else {
            accessibleMeetings = await getMeetingsForUser(uid, teamId);
        }
        
        let allTasks = [];
        for (const meeting of accessibleMeetings) {
            try {
                const tasks = await getTasks(meeting.id, uid);
                tasks.forEach(t => {
                    allTasks.push({
                        ...t,
                        meetingId: meeting.id,
                        meetingTitle: meeting.title,
                        meetingCode: meeting.code
                    });
                });
            } catch (taskErr) {
                console.warn(`Không đọc được tasks của meeting ${meeting.id}:`, taskErr.message);
            }
        }
        
        return allTasks;
    } catch (error) {
        console.error('Error getting user tasks:', error);
        return [];
    }
}

/**
 * Add a task (with CLOSED check)
 * ĐÃ NÂNG CẤP: Hỗ trợ nhiều người được giao (assignedTo là object map)
 * Hoặc chỉ định "ALL" cho tất cả thành viên
 * @param {string} meetingId
 * @param {Object} taskData - { assignedTo: {uid1:true, uid2:true} HOẶC {__ALL__:true}, assignedToNames: string, ... }
 * @returns {Promise<string>} Task ID
 */
async function addTask(meetingId, taskData) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể thêm nhiệm vụ vào cuộc họp đã chốt');
    }
    
    const taskRef = db.ref(`tasks/${meetingId}`).push();
    const taskId = taskRef.key;
    
    const now = firebase.database.ServerValue.TIMESTAMP;
    const data = {
        ...taskData,
        assignedBy: uid,
        assignedAt: now,
        confirmed: false,
        status: 'PENDING'
    };
    
    await taskRef.set(data);
    
    await logActivity(meetingId, uid, 'ASSIGN_TASK', 'TASK', taskId,
        `Đã phân công nhiệm vụ cho ${taskData.assignedToNames || 'thành viên'}`);
    
    return taskId;
}

/**
 * Cập nhật nhiệm vụ (không cho sửa khi đã xác nhận hoặc meeting đã chốt)
 * @param {string} meetingId
 * @param {string} taskId
 * @param {Object} updates - { assignedTo, assignedToNames, title, description, deadline, product }
 * @returns {Promise<void>}
 */
async function updateTask(meetingId, taskId, updates) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể sửa nhiệm vụ trong cuộc họp đã chốt');
    }
    
    const snapshot = await db.ref(`tasks/${meetingId}/${taskId}`).once('value');
    const current = snapshot.val();
    if (!current) throw new Error('Không tìm thấy nhiệm vụ');
    
    if (current.confirmed) {
        throw new Error('Không thể sửa nhiệm vụ đã được xác nhận');
    }
    
    await db.ref(`tasks/${meetingId}/${taskId}`).update({
        ...updates,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        updatedBy: uid
    });
    
    try {
        await logActivity(
            meetingId, uid, 'UPDATE_TASK', 'TASK', taskId,
            `Đã cập nhật nhiệm vụ: "${updates.title || current.title || ''}"`
        );
    } catch (e) {
        console.warn('Không ghi được activity log:', e);
    }
}

window.updateTask = updateTask;
/**
 * Confirm task (with CLOSED check + validation chống undefined)
 * ĐÃ NÂNG CẤP: Hỗ trợ nhiều người nhận nhiệm vụ (assignedTo object map)
 * @param {string} meetingId
 * @param {string} taskId
 */
async function confirmTask(meetingId, taskId) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (!meetingId
        || meetingId === 'undefined'
        || meetingId === 'null'
        || meetingId === ''
        || typeof meetingId !== 'string') {
        throw new Error('Không xác định được cuộc họp. Vui lòng refresh trang (Ctrl+F5) và thử lại.');
    }
    
    if (!taskId
        || taskId === 'undefined'
        || taskId === 'null'
        || taskId === ''
        || typeof taskId !== 'string') {
        throw new Error('Không xác định được nhiệm vụ. Vui lòng refresh trang (Ctrl+F5) và thử lại.');
    }
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể xác nhận nhiệm vụ trong cuộc họp đã chốt');
    }
    
    const task = await db.ref(`tasks/${meetingId}/${taskId}`).once('value');
    const taskData = task.val();
    
    if (!taskData) {
        throw new Error('Không tìm thấy nhiệm vụ trong hệ thống');
    }
    
    // Kiểm tra quyền: user phải nằm trong assignedTo HOẶC là admin
    const isAdminUser = await isAdmin();
    let hasPermission = isAdminUser;
    
    if (!hasPermission && taskData.assignedTo) {
        if (typeof taskData.assignedTo === 'string') {
            hasPermission = taskData.assignedTo === uid;
        } else {
            hasPermission = taskData.assignedTo[uid] === true 
                         || taskData.assignedTo['__ALL__'] === true;
        }
    }
    
    if (!hasPermission) {
        throw new Error('Bạn không được giao nhiệm vụ này');
    }
    
    if (taskData.confirmed) {
        throw new Error('Nhiệm vụ này đã được xác nhận trước đó');
    }
    
    await db.ref(`tasks/${meetingId}/${taskId}`).update({
        confirmed: true,
        confirmedAt: firebase.database.ServerValue.TIMESTAMP,
        confirmedBy: uid,
        status: 'CONFIRMED'
    });
    
    try {
        await logActivity(
            meetingId, uid, 'CONFIRM_TASK', 'TASK', taskId,
            `Đã xác nhận nhiệm vụ: "${taskData.title || 'Nhiệm vụ'}"`
        );
    } catch (logErr) {
        console.warn('Không ghi được activity log:', logErr);
    }
}

/**
 * Get confirmations for a meeting
 * @param {string} meetingId
 * @returns {Promise<Object>}
 */
async function getConfirmations(meetingId) {
    try {
        const snapshot = await db.ref(`confirmations/${meetingId}`).once('value');
        const data = snapshot.val();
        return data || {};
    } catch (error) {
        console.error('Error getting confirmations:', error);
        return {};
    }
}

/**
 * Cập nhật một trường xác nhận cụ thể
 * @param {string} meetingId
 * @param {string} field - 'participated' | 'conclusionRead' | 'finalConfirmed'
 * @param {*} value
 * @returns {Promise<void>}
 */
async function updateConfirmation(meetingId, field, value) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể cập nhật xác nhận cho cuộc họp đã chốt');
    }
    
    const confRef = db.ref(`confirmations/${meetingId}/${uid}`);
    const updates = {};
    
    updates[field] = value;
    if (value === true) {
        updates[field + 'At'] = firebase.database.ServerValue.TIMESTAMP;
    }
    
    await confRef.update(updates);
    console.log(`✅ Đã cập nhật ${field} = ${value} cho user ${uid}`);
}

/**
 * Ghi nhận xác nhận của user cho meeting
 * Đã nâng cấp: dùng update() để đảm bảo ghi được khi node chưa tồn tại
 * @param {string} meetingId
 * @param {string} type - 'PARTICIPATION' | 'CONCLUSION_READ' | 'FINAL'
 * @returns {Promise<void>}
 */
async function recordConfirmation(meetingId, type) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể xác nhận cho cuộc họp đã chốt');
    }
    
    const now = firebase.database.ServerValue.TIMESTAMP;
    const confRef = db.ref(`confirmations/${meetingId}/${uid}`);
    
    const updates = {};
    
    if (type === 'PARTICIPATION') {
        updates.participated = true;
        updates.participatedAt = now;
    } else if (type === 'CONCLUSION_READ') {
        updates.conclusionRead = true;
        updates.conclusionReadAt = now;
    } else if (type === 'FINAL') {
        updates.finalConfirmed = true;
        updates.finalConfirmedAt = now;
        updates.finalConfirmationId = `CONF_${meetingId}_${uid}_${Date.now()}`;
    } else {
        throw new Error('Loại xác nhận không hợp lệ: ' + type);
    }
    
    try {
        await confRef.update(updates);
        console.log(`✅ Đã ghi xác nhận ${type} cho meeting ${meetingId}, user ${uid}`);
    } catch (err) {
        console.error(`❌ Lỗi ghi xác nhận ${type}:`, err);
        if (err.code === 'PERMISSION_DENIED') {
            throw new Error('Không có quyền xác nhận. Vui lòng kiểm tra Rules Firebase.');
        }
        throw err;
    }
    
    try {
        const typeLabel = type === 'PARTICIPATION' ? 'tham gia'
                        : type === 'CONCLUSION_READ' ? 'đã đọc kết luận'
                        : 'hồ sơ';
        await logActivity(
            meetingId, uid, `CONFIRM_${type}`, 'CONFIRMATION', meetingId,
            `Đã xác nhận ${typeLabel}`
        );
    } catch (logErr) {
        console.warn('Không ghi được activity log:', logErr);
    }
}
/**
 * Xác nhận NHANH TẤT CẢ các bước còn thiếu trong 1 request
 * Bao gồm: viewedMeetingAt, participated, conclusionRead, finalConfirmed
 * Chỉ update những bước CHƯA có (không ghi đè timestamp cũ)
 * @param {string} meetingId
 * @returns {Promise<Object>} { updated: number, alreadyDone: boolean, updatedFields: Array }
 */
async function recordConfirmationAll(meetingId) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể xác nhận cho cuộc họp đã chốt');
    }
    
    const meeting = await getMeeting(meetingId);
    if (!meeting) throw new Error('Không tìm thấy cuộc họp');
    
    const isMember = meeting.memberIds && meeting.memberIds[uid] === true;
    if (!isMember) {
        throw new Error('Bạn không phải thành viên của cuộc họp này');
    }
    
    const confirmations = await getConfirmations(meetingId);
    const userConf = confirmations[uid] || {};
    
    const contents = await getMeetingContents(meetingId);
    const hasConcluded = contents.some(c => c.status === 'CONCLUDED');
    const isConfirmation = meeting.status === 'CONFIRMATION';
    
    const updates = {};
    const updatedFields = [];
    const now = firebase.database.ServerValue.TIMESTAMP;
    
    if (!userConf.viewedMeetingAt) {
        updates.viewedMeetingAt = now;
        updatedFields.push('viewedMeetingAt');
    }
    if (!userConf.participated) {
        updates.participated = true;
        updates.participatedAt = now;
        updatedFields.push('participated');
    }
    if (hasConcluded && !userConf.conclusionRead) {
        updates.conclusionRead = true;
        updates.conclusionReadAt = now;
        updatedFields.push('conclusionRead');
    }
    if (isConfirmation && !userConf.finalConfirmed) {
        updates.finalConfirmed = true;
        updates.finalConfirmedAt = now;
        updates.finalConfirmationId = `CONF_${meetingId}_${uid}_${Date.now()}`;
        updatedFields.push('finalConfirmed');
    }
    
    if (Object.keys(updates).length === 0) {
        return { updated: 0, alreadyDone: true, updatedFields: [] };
    }
    
    await db.ref(`confirmations/${meetingId}/${uid}`).update(updates);
    
    try {
        await logActivity(
            meetingId, uid, 'CONFIRM_ALL', 'CONFIRMATION', meetingId,
            `Đã xác nhận nhanh ${updatedFields.length} bước: ${updatedFields.join(', ')}`
        );
    } catch (e) {
        console.warn('Không ghi được activity log:', e);
    }
    
    return { 
        updated: updatedFields.length, 
        alreadyDone: false,
        updatedFields: updatedFields
    };
}

window.recordConfirmationAll = recordConfirmationAll;
/**
 * Add an attachment by Google Drive URL (with fileId extraction)
 * @param {string} meetingId
 * @param {string} url - Google Drive share link
 * @param {string} fileName - Name of the file
 * @param {string} fileType - MIME type or extension
 * @param {string} type - 'CONTENT'|'DISCUSSION'|'CONCLUSION'
 * @param {string} contentId - Optional content ID
 * @param {string} customFileId - Optional pre-extracted fileId
 * @returns {Promise<Object>} File metadata
 */
async function addAttachmentByUrl(meetingId, url, fileName, fileType, type = 'DISCUSSION', contentId = null, customFileId = null) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể thêm tài liệu vào cuộc họp đã chốt');
    }
    
    if (!url || !url.startsWith('http')) {
        throw new Error('Link không hợp lệ. Vui lòng nhập URL Google Drive hợp lệ.');
    }
    
    const driveFileId = customFileId || extractGoogleDriveId(url);
    if (!driveFileId) {
        throw new Error('Không nhận diện được Google Drive File ID từ link.');
    }
    
    const firebaseKey = `gdrive_${driveFileId}`;
    
    const metadata = {
        fileName: fileName || 'Tài liệu',
        fileType: fileType || 'application/octet-stream',
        url: url,
        fileId: driveFileId,
        source: 'googledrive',
        uploadedBy: uid,
        uploadedAt: firebase.database.ServerValue.TIMESTAMP,
        type: type,
        contentId: contentId || null
    };
    
    await db.ref(`attachments/${meetingId}/${firebaseKey}`).set(metadata);
    
    if (type === 'CONTENT' && contentId) {
        await db.ref(`meetingContents/${meetingId}/${contentId}/attachments/${firebaseKey}`).set(metadata);
    } else if (type === 'CONCLUSION' && contentId) {
        await db.ref(`meetingContents/${meetingId}/${contentId}/conclusionAttachments/${firebaseKey}`).set(metadata);
    }
    
    await logActivity(meetingId, uid, 'UPLOAD_FILE', 'ATTACHMENT', firebaseKey,
        `Đã thêm tài liệu: ${fileName || 'Tài liệu'} (ID: ${driveFileId.substring(0,8)}…)`);
    
    return { fileId: firebaseKey, driveFileId, ...metadata };
}

/**
 * Add multiple attachments by URLs (with fileId extraction)
 * @param {string} meetingId
 * @param {Array} attachments - Array of {url, fileName, fileType, type, contentId, fileId}
 * @returns {Promise<Array>}
 */
async function addAttachmentsByUrls(meetingId, attachments) {
    const results = [];
    for (const att of attachments) {
        try {
            const result = await addAttachmentByUrl(
                meetingId,
                att.url,
                att.fileName,
                att.fileType,
                att.type || 'DISCUSSION',
                att.contentId || null,
                att.fileId || null
            );
            results.push(result);
        } catch (error) {
            console.error('Error adding attachment:', error);
        }
    }
    return results;
}

/**
 * Lấy TẤT CẢ cuộc họp mà một user có quyền xem
 * Bao gồm:
 *   - Cuộc họp thuộc tổ của user (dù user có trong memberIds hay không)
 *   - Cuộc họp mà user là khách mời (có uid trong memberIds nhưng khác teamId)
 * @param {string} uid - User ID
 * @param {string} teamId - Team ID của user (có thể null)
 * @returns {Promise<Array>}
 */
async function getMeetingsForUser(uid, teamId) {
    try {
        const snapshot = await db.ref('meetings').once('value');
        const data = snapshot.val();
        if (!data) return [];
        
        const allMeetings = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
        
        return allMeetings.filter(m => {
            if (teamId && m.teamId === teamId) return true;
            if (m.memberIds && m.memberIds[uid] === true) return true;
            return false;
        });
    } catch (error) {
        console.error('Error getting meetings for user:', error);
        return [];
    }
}

/**
 * Xóa vĩnh viễn một cuộc họp và toàn bộ dữ liệu liên quan
 * Sử dụng multi-path update để xóa đồng thời nhiều nhánh
 * CHỈ ADMIN mới có quyền gọi hàm này
 * @param {string} meetingId - ID cuộc họp cần xóa
 * @returns {Promise<boolean>} true nếu thành công
 */
async function deleteMeeting(meetingId) {
    const uid = getCurrentUid();
    if (!uid) {
        showToast('Vui lòng đăng nhập', 'error');
        return false;
    }
    
    const role = await getCurrentUserRole();
    if (role !== 'admin') {
        showToast('❌ Chỉ Admin mới có quyền xóa cuộc họp', 'error', 4000);
        return false;
    }
    
    const meeting = await getMeeting(meetingId);
    if (!meeting) {
        showToast('Không tìm thấy cuộc họp', 'error');
        return false;
    }
    
    return new Promise((resolve) => {
        showConfirm(
            '🗑️ Xóa cuộc họp',
            `<div style="line-height:1.7;">
                Bạn có chắc chắn muốn xóa <strong>VĨNH VIỄN</strong> cuộc họp
                <strong style="color:#dc2626;">"${escapeHtml(meeting.title || 'Không tên')}"</strong>
                (Mã: ${escapeHtml(meeting.code || 'N/A')})?
                <br><br>
                <div style="padding:12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;">
                    <strong style="color:#991b1b;">⚠️ Toàn bộ dữ liệu sau sẽ bị xóa:</strong>
                    <ul style="margin:8px 0 0 20px;padding:0;color:#7f1d1d;font-size:14px;">
                        <li>Thông tin cuộc họp</li>
                        <li>Nội dung và kết luận</li>
                        <li>Ý kiến thảo luận</li>
                        <li>Nhiệm vụ đã phân công</li>
                        <li>Xác nhận của thành viên</li>
                        <li>Tài liệu đính kèm</li>
                        <li>Nhật ký hoạt động</li>
                        <li>Phụ lục (nếu có)</li>
                    </ul>
                </div>
                <br>
                <span style="color:#dc2626;font-weight:700;font-size:15px;">
                    🚨 Hành động này KHÔNG THỂ HOÀN TÁC!
                </span>
            </div>`,
            async () => {
                try {
                    const updates = {};
                    
                    updates[`meetings/${meetingId}`] = null;
                    updates[`meetingContents/${meetingId}`] = null;
                    updates[`discussions/${meetingId}`] = null;
                    updates[`tasks/${meetingId}`] = null;
                    updates[`confirmations/${meetingId}`] = null;
                    updates[`attachments/${meetingId}`] = null;
                    updates[`activityLogs/${meetingId}`] = null;
                    updates[`appendices/${meetingId}`] = null;
                    
                    await db.ref().update(updates);
                    
                    showToast('🗑️ Đã xóa cuộc họp thành công!', 'success', 4000);
                    
                    if (typeof navigateTo === 'function') {
                        navigateTo('meetings');
                    }
                    
                    resolve(true);
                } catch (error) {
                    console.error('Delete meeting error:', error);
                    
                    let msg = error.message || 'Lỗi không xác định';
                    if (error.code === 'PERMISSION_DENIED' || msg.includes('permission')) {
                        msg = 'Không có quyền xóa. Vui lòng kiểm tra Rules Firebase.';
                    }
                    
                    showToast('❌ Lỗi xóa cuộc họp: ' + msg, 'error', 5000);
                    resolve(false);
                }
            },
            '🗑️ Xóa vĩnh viễn'
        );
    });
}

// ============================================================
// EXPORTS
// ============================================================
window.getMeetingsByTeam = getMeetingsByTeam;
window.getAllMeetings = getAllMeetings;
window.getMeeting = getMeeting;
window.isMeetingClosed = isMeetingClosed;
window.createMeeting = createMeeting;
window.updateMeeting = updateMeeting;
window.updateMeetingStatus = updateMeetingStatus;
window.recordMeetingView = recordMeetingView;
window.getMeetingContents = getMeetingContents;
window.addMeetingContent = addMeetingContent;
window.updateMeetingContent = updateMeetingContent;
window.getDiscussions = getDiscussions;
window.addDiscussion = addDiscussion;
window.updateDiscussion = updateDiscussion;
window.getTasks = getTasks;
window.getAllUserTasks = getAllUserTasks;
window.addTask = addTask;
window.confirmTask = confirmTask;
window.getConfirmations = getConfirmations;
window.updateConfirmation = updateConfirmation;
window.recordConfirmation = recordConfirmation;
window.addAttachmentByUrl = addAttachmentByUrl;
window.addAttachmentsByUrls = addAttachmentsByUrls;
window.getMeetingsForUser = getMeetingsForUser;
window.deleteMeeting = deleteMeeting;
window.removeDiscussion = removeDiscussion;