// ============================================================
// DATABASE OPERATIONS MODULE
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
 * @param {string} meetingId
 * @param {Object} discussionData
 * @returns {Promise<string>} Discussion ID
 */
/**
 * Add a discussion (with CLOSED check)
 * Đã bổ sung: tăng discussionCount của meeting sau khi push thành công
 * @param {string} meetingId
 * @param {Object} discussionData
 * @returns {Promise<string>} Discussion ID
 */
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
    
    // === TĂNG discussionCount TỔNG CỦA MEETING ===
    try {
        await db.ref(`meetings/${meetingId}/discussionCount`).transaction(function(currentCount) {
            return (currentCount || 0) + 1;
        });
    } catch (countError) {
        console.warn('Không cập nhật được discussionCount tổng:', countError);
    }
    
    // === TĂNG discussionCount RIÊNG CỦA CONTENT (nếu có) ===
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
    
    // Ghi log hoạt động
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

window.addDiscussion = addDiscussion;



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
 * Get tasks for a meeting
 * @param {string} meetingId
 * @param {string} assignedTo - Optional filter by user
 * @returns {Promise<Array>}
 */
async function getTasks(meetingId, assignedTo = null) {
    try {
        const snapshot = await db.ref(`tasks/${meetingId}`).once('value');
        const data = snapshot.val();
        if (!data) return [];
        
        let tasks = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
        
        if (assignedTo) {
            tasks = tasks.filter(t => t.assignedTo === assignedTo);
        }
        
        return tasks;
    } catch (error) {
        console.error('Error getting tasks:', error);
        return [];
    }
}

/**
 * Add a task (with CLOSED check)
 * @param {string} meetingId
 * @param {Object} taskData
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
        `Đã phân công nhiệm vụ cho ${taskData.assignedByName || 'giáo viên'}`);
    
    return taskId;
}

/**
 * Confirm task (with CLOSED check)
 * @param {string} meetingId
 * @param {string} taskId
 */
async function confirmTask(meetingId, taskId) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể xác nhận nhiệm vụ trong cuộc họp đã chốt');
    }
    
    const task = await db.ref(`tasks/${meetingId}/${taskId}`).once('value');
    const taskData = task.val();
    if (!taskData) throw new Error('Không tìm thấy nhiệm vụ');
    if (taskData.assignedTo !== uid && !await isAdmin()) {
        throw new Error('Bạn không được giao nhiệm vụ này');
    }
    if (taskData.confirmed) {
        throw new Error('Nhiệm vụ đã được xác nhận');
    }
    
    await db.ref(`tasks/${meetingId}/${taskId}`).update({
        confirmed: true,
        confirmedAt: firebase.database.ServerValue.TIMESTAMP,
        confirmedBy: uid,
        status: 'CONFIRMED'
    });
    
    await logActivity(meetingId, uid, 'CONFIRM_TASK', 'TASK', taskId, 
        `Đã xác nhận nhiệm vụ: "${taskData.title || 'Nhiệm vụ'}"`);
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
 * Update user confirmation (with CLOSED check)
 * @param {string} meetingId
 * @param {string} field - 'participated'|'conclusionRead'|'finalConfirmed'
 * @param {*} value
 */
async function updateConfirmation(meetingId, field, value) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể cập nhật xác nhận cho cuộc họp đã chốt');
    }
    
    const updates = {};
    updates[field] = value;
    if (value === true) {
        updates[field + 'At'] = firebase.database.ServerValue.TIMESTAMP;
    }
    
    await db.ref(`confirmations/${meetingId}/${uid}`).update(updates);
}

/**
 * Record user confirmation (with CLOSED check)
 * @param {string} meetingId
 * @param {string} type - 'PARTICIPATION'|'FINAL'
 */
async function recordConfirmation(meetingId, type) {
    const uid = getCurrentUid();
    if (!uid) throw new Error('Chưa đăng nhập');
    
    if (await isMeetingClosed(meetingId)) {
        throw new Error('Không thể xác nhận cho cuộc họp đã chốt');
    }
    
    const confRef = db.ref(`confirmations/${meetingId}/${uid}`);
    const now = firebase.database.ServerValue.TIMESTAMP;
    
    if (type === 'PARTICIPATION') {
        await confRef.update({
            participated: true,
            participatedAt: now
        });
    } else if (type === 'FINAL') {
        await confRef.update({
            finalConfirmed: true,
            finalConfirmedAt: now,
            finalConfirmationId: `CONF_${meetingId}_${uid}_${Date.now()}`
        });
    }
    
    await logActivity(meetingId, uid, `CONFIRM_${type}`, 'CONFIRMATION', meetingId, 
        `Đã xác nhận ${type === 'PARTICIPATION' ? 'tham gia' : 'hồ sơ'}`);
}

// ============================================================
// ATTACHMENT FUNCTIONS (Google Drive URLs only)
// ============================================================

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
window.addTask = addTask;
window.confirmTask = confirmTask;
window.getConfirmations = getConfirmations;
window.updateConfirmation = updateConfirmation;
window.recordConfirmation = recordConfirmation;
window.addAttachmentByUrl = addAttachmentByUrl;
window.addAttachmentsByUrls = addAttachmentsByUrls;