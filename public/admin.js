// ============================================
// COLLEGE CLUB ELECTION - ADMIN DASHBOARD
// ============================================

// Global State
let allNominations = [];
let filteredNominations = [];
let currentUser = null;
let currentNominationId = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[v0] Admin dashboard loaded');

    // Check if user is logged in
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('[v0] Admin user logged in:', user.email);
            currentUser = user;
            loadNominations();
        } else {
            console.log('[v0] No user logged in, redirecting to main page');
            window.location.href = 'index.html';
        }
    });

    // Setup filter listeners
    document.getElementById('semesterFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('postFilter').addEventListener('change', applyFilters);
});

// ============================================
// LOAD & DISPLAY NOMINATIONS
// ============================================

function loadNominations() {
    console.log('[v0] Loading nominations from Firestore');

    // Real-time listener for nominations
    firebase.firestore().collection('nominations')
        .onSnapshot((snapshot) => {
            allNominations = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                allNominations.push({
                    id: doc.id,
                    ...data,
                    submittedDate: data.submittedDate ? data.submittedDate.toDate() : new Date()
                });
            });

            console.log('[v0] Loaded nominations:', allNominations.length);
            applyFilters();
        }, (error) => {
            console.error('[v0] Error loading nominations:', error);
            showToast('Error loading nominations: ' + error.message, 'error');
        });
}

function displayNominations(nominations) {
    console.log('[v0] Displaying nominations:', nominations.length);

    const tbody = document.getElementById('nominationsBody');
    const emptyState = document.getElementById('emptyState');

    if (nominations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No nominations found.</td></tr>';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    tbody.innerHTML = nominations.map(nomination => `
        <tr>
            <td>${escapeHtml(nomination.email)}</td>
            <td>${escapeHtml(nomination.studentName)}</td>
            <td>${nomination.posts.join(', ')}</td>
            <td>
                ${nomination.photoUrl ? 
                    `<button class="action-button action-button-download" onclick="downloadFile('${nomination.photoUrl}', '${nomination.email}-photo')">Download</button>` 
                    : 'N/A'}
            </td>
            <td>
                ${nomination.resumeUrl ? 
                    `<button class="action-button action-button-download" onclick="downloadFile('${nomination.resumeUrl}', '${nomination.email}-resume')">Download</button>` 
                    : 'N/A'}
            </td>
            <td>
                <span class="status-badge status-${nomination.status}">
                    ${capitalize(nomination.status)}
                </span>
            </td>
            <td>${nomination.submittedDate ? nomination.submittedDate.toLocaleString() : 'N/A'}</td>
            <td>
                <button class="action-button action-button-view" onclick="viewNominationDetails('${nomination.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// FILTERS
// ============================================

function applyFilters() {
    console.log('[v0] Applying filters');

    const semester = document.getElementById('semesterFilter').value;
    const status = document.getElementById('statusFilter').value;
    const post = document.getElementById('postFilter').value;

    filteredNominations = allNominations.filter(nomination => {
        let match = true;

        if (semester !== 'all' && nomination.semester !== semester) {
            match = false;
        }

        if (status !== 'all' && nomination.status !== status) {
            match = false;
        }

        if (post !== 'all' && !nomination.posts.includes(post)) {
            match = false;
        }

        return match;
    });

    console.log('[v0] Filtered nominations:', filteredNominations.length);
    displayNominations(filteredNominations);
}

// ============================================
// VIEW NOMINATION DETAILS
// ============================================

function viewNominationDetails(nominationId) {
    console.log('[v0] Viewing nomination details:', nominationId);

    currentNominationId = nominationId;
    const nomination = allNominations.find(n => n.id === nominationId);

    if (!nomination) {
        showToast('Nomination not found', 'error');
        return;
    }

    const detailsDiv = document.getElementById('nominationDetails');
    
    let html = `
        <div class="detail-row">
            <label>Email</label>
            <p>${escapeHtml(nomination.email)}</p>
        </div>
        <div class="detail-row">
            <label>Name</label>
            <p>${escapeHtml(nomination.studentName)}</p>
        </div>
        <div class="detail-row">
            <label>Student ID</label>
            <p>${escapeHtml(nomination.studentId)}</p>
        </div>
        <div class="detail-row">
            <label>Class Year</label>
            <p>${escapeHtml(nomination.classYear)}</p>
        </div>
        <div class="detail-row">
            <label>Posts Nominated</label>
            <p>${nomination.posts.join(', ')}</p>
        </div>
    `;

    if (nomination.statement) {
        html += `
            <div class="detail-row">
                <label>Statement of Purpose</label>
                <p>${escapeHtml(nomination.statement)}</p>
            </div>
        `;
    }

    if (nomination.photoUrl) {
        html += `
            <div class="detail-row">
                <label>Photo</label>
                <img src="${nomination.photoUrl}" alt="Candidate photo">
            </div>
        `;
    }

    html += `
        <div class="detail-row">
            <label>Status</label>
            <p><span class="status-badge status-${nomination.status}">${capitalize(nomination.status)}</span></p>
        </div>
        <div class="detail-row">
            <label>Submitted Date</label>
            <p>${nomination.submittedDate.toLocaleString()}</p>
        </div>
    `;

    detailsDiv.innerHTML = html;

    // Update action buttons based on status
    const approveBtn = document.querySelector('.modal-actions .btn-success');
    const rejectBtn = document.querySelector('.modal-actions .btn-danger');

    if (nomination.status === 'approved') {
        approveBtn.disabled = true;
        rejectBtn.disabled = false;
        rejectBtn.textContent = 'Revoke Approval';
    } else if (nomination.status === 'rejected') {
        approveBtn.disabled = false;
        approveBtn.textContent = 'Override Rejection';
        rejectBtn.disabled = true;
    } else {
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
        approveBtn.textContent = 'Approve';
        rejectBtn.textContent = 'Reject';
    }

    // Show modal
    document.getElementById('nominationModal').style.display = 'block';
}

// ============================================
// APPROVE / REJECT NOMINATIONS
// ============================================

async function approveNomination() {
    console.log('[v0] Approving nomination:', currentNominationId);

    try {
        await firebase.firestore().collection('nominations').doc(currentNominationId).update({
            status: 'approved',
            updatedDate: new Date()
        });

        showToast('Nomination approved successfully', 'success');
        closeModal();
        loadNominations();
    } catch (error) {
        console.error('[v0] Error approving nomination:', error);
        showToast('Error approving nomination: ' + error.message, 'error');
    }
}

async function rejectNomination() {
    console.log('[v0] Rejecting nomination:', currentNominationId);

    try {
        await firebase.firestore().collection('nominations').doc(currentNominationId).update({
            status: 'rejected',
            updatedDate: new Date()
        });

        showToast('Nomination rejected', 'success');
        closeModal();
        loadNominations();
    } catch (error) {
        console.error('[v0] Error rejecting nomination:', error);
        showToast('Error rejecting nomination: ' + error.message, 'error');
    }
}

// ============================================
// EXPORT TO PDF
// ============================================

function exportNominationsToPDF() {
    console.log('[v0] Exporting nominations to PDF');

    if (filteredNominations.length === 0) {
        showToast('No nominations to export', 'warning');
        return;
    }

    // Create HTML table for PDF
    let htmlContent = `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #1a3a52; text-align: center; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #1a3a52; color: white; padding: 10px; text-align: left; }
                td { border: 1px solid #ddd; padding: 10px; }
                tr:nth-child(even) { background-color: #f5f5f5; }
                .timestamp { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>College Club Election Nominations Report</h1>
            <table>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Posts</th>
                        <th>Status</th>
                        <th>Submitted Date</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Add nomination rows
    filteredNominations.forEach(nomination => {
        htmlContent += `
            <tr>
                <td>${escapeHtml(nomination.email)}</td>
                <td>${escapeHtml(nomination.studentName)}</td>
                <td>${nomination.posts.join(', ')}</td>
                <td>${capitalize(nomination.status)}</td>
                <td>${nomination.submittedDate.toLocaleString()}</td>
            </tr>
        `;
    });

    htmlContent += `
                </tbody>
            </table>
            <div class="timestamp">
                Generated on ${new Date().toLocaleString()}
            </div>
        </body>
        </html>
    `;

    // Create PDF using html2pdf
    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const opt = {
        margin: 10,
        filename: `nominations-${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
    showToast('PDF exported successfully', 'success');
}

// ============================================
// FILE DOWNLOAD
// ============================================

function downloadFile(url, filename) {
    console.log('[v0] Downloading file:', filename);

    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(xhr.response);
        link.download = filename;
        link.click();
    };
    xhr.open('GET', url);
    xhr.send();
}

// ============================================
// LOGOUT
// ============================================

function logoutAdmin() {
    console.log('[v0] Admin logout');

    firebase.auth().signOut()
        .then(() => {
            console.log('[v0] User signed out');
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('[v0] Logout error:', error);
            showToast('Error logging out: ' + error.message, 'error');
        });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function closeModal() {
    console.log('[v0] Closing modal');
    document.getElementById('nominationModal').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('nominationModal');
    if (event.target === modal) {
        closeModal();
    }
}

console.log('[v0] Admin dashboard admin.js loaded');
