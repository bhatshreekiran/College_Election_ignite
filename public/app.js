// ============================================
// COLLEGE CLUB ELECTION - STUDENT PORTAL
// ============================================

// Global State
let currentStep = 1;
let formData = {
    email: '',
    studentName: '',
    studentId: '',
    classYear: '',
    posts: [],
    photo: null,
    photoFile: null,
    resumePdf: null,
    resumePdfFile: null,
    statement: ''
};

let currentNominationId = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[v0] Student portal loaded');
    
    // Character counter for statement
    const statementInput = document.getElementById('statement');
    if (statementInput) {
        statementInput.addEventListener('input', function() {
            document.getElementById('charCount').textContent = this.value.length;
        });
    }

    // File preview handlers
    const photoInput = document.getElementById('photo');
    const resumeInput = document.getElementById('resumePdf');

    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoUpload);
    }

    if (resumeInput) {
        resumeInput.addEventListener('change', handleResumeUpload);
    }

    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', openLoginModal);
    }
});

// ============================================
// STEP NAVIGATION
// ============================================

function goToStep(stepNumber) {
    console.log('[v0] Going to step:', stepNumber);
    // Hide all steps
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';

    // Show target step
    document.getElementById('step' + stepNumber).style.display = 'block';

    // Update progress bar
    const progress = (stepNumber / 3) * 100;
    document.getElementById('progressFill').style.width = progress + '%';

    currentStep = stepNumber;
}

// ============================================
// STEP 1: IDENTITY VERIFICATION
// ============================================

function validateStep1() {
    console.log('[v0] Validating step 1');
    const email = document.getElementById('email').value.trim();
    const studentName = document.getElementById('studentName').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const classYear = document.getElementById('classYear').value;

    // Basic validation
    if (!email || !studentName || !studentId || !classYear) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Email format validation
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Email domain validation
    if (!isAllowedEmailDomain(email)) {
        showToast('Email must be from an approved school domain', 'error');
        return;
    }

    // Check if email already exists
    checkEmailExists(email).then(exists => {
        if (exists) {
            showToast('This email has already submitted a nomination', 'warning');
            return;
        }

        // Save form data
        formData.email = email;
        formData.studentName = studentName;
        formData.studentId = studentId;
        formData.classYear = classYear;

        console.log('[v0] Step 1 validation passed:', formData);
        goToStep(2);
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isAllowedEmailDomain(email) {
    const allowedDomains = ['school.edu']; // Update with your domains
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain.toLowerCase());
}

async function checkEmailExists(email) {
    try {
        const docRef = firebase.firestore().collection('nominations').doc(email);
        const doc = await docRef.get();
        console.log('[v0] Email exists check:', doc.exists);
        return doc.exists;
    } catch (error) {
        console.error('[v0] Error checking email:', error);
        return false;
    }
}

// ============================================
// STEP 2: POST SELECTION
// ============================================

function validateStep2() {
    console.log('[v0] Validating step 2');
    const selectedPosts = Array.from(document.querySelectorAll('input[name="posts"]:checked'))
        .map(checkbox => checkbox.value);

    if (selectedPosts.length === 0) {
        showToast('Please select at least one post', 'error');
        return;
    }

    if (selectedPosts.length > 3) {
        showToast('You can select a maximum of 3 posts', 'error');
        return;
    }

    formData.posts = selectedPosts;
    console.log('[v0] Selected posts:', formData.posts);
    goToStep(3);
}

// ============================================
// STEP 3: FILE UPLOADS & SUBMISSION
// ============================================

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    console.log('[v0] Photo upload:', file?.name);

    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
        showToast('Photo must be less than 5MB', 'error');
        event.target.value = '';
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (JPG, PNG, GIF)', 'error');
        event.target.value = '';
        return;
    }

    // Store file and create preview
    formData.photoFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        formData.photo = e.target.result;
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Photo preview"><span>✓ ${file.name}</span>`;
        preview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function handleResumeUpload(event) {
    const file = event.target.files[0];
    console.log('[v0] Resume upload:', file?.name);

    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
        showToast('Resume must be less than 5MB', 'error');
        event.target.value = '';
        return;
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        event.target.value = '';
        return;
    }

    // Store file and create preview
    formData.resumePdfFile = file;
    formData.resumePdf = file.name;
    const preview = document.getElementById('pdfPreview');
    preview.innerHTML = `<span>📄 ${file.name}</span>`;
    preview.style.display = 'flex';
}

async function submitNomination(event) {
    event.preventDefault();
    console.log('[v0] Submitting nomination');

    const termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        showToast('Please confirm that all information is accurate', 'error');
        return;
    }

    // Get statement
    formData.statement = document.getElementById('statement').value.trim();

    try {
        // Upload files to Firebase Storage if they exist
        let photoUrl = null;
        let resumeUrl = null;

        if (formData.photoFile) {
            console.log('[v0] Uploading photo to Firebase Storage');
            photoUrl = await uploadFileToStorage('photos', formData.email, formData.photoFile);
        }

        if (formData.resumePdfFile) {
            console.log('[v0] Uploading resume to Firebase Storage');
            resumeUrl = await uploadFileToStorage('resumes', formData.email, formData.resumePdfFile);
        }

        // Create nomination document
        const nominationData = {
            email: formData.email,
            studentName: formData.studentName,
            studentId: formData.studentId,
            classYear: formData.classYear,
            posts: formData.posts,
            photoUrl: photoUrl,
            resumeUrl: resumeUrl,
            statement: formData.statement,
            status: 'pending',
            submittedDate: new Date(),
            semester: 'Fall 2024'
        };

        // Save to Firestore with email as document ID
        await firebase.firestore().collection('nominations').doc(formData.email).set(nominationData);
        console.log('[v0] Nomination saved to Firestore');

        // Send confirmation email
        const emailSent = await sendConfirmationEmail(
            formData.email,
            formData.studentName,
            formData.posts,
            nominationData
        );

        // Show success message
        showSuccessMessage(nominationData);

        // Reset form for next nomination
    } catch (error) {
        console.error('[v0] Error submitting nomination:', error);
        showToast('Error submitting nomination: ' + error.message, 'error');
    }
}

async function uploadFileToStorage(folderName, email, file) {
    try {
        const timestamp = new Date().getTime();
        const filename = `${email}-${timestamp}-${file.name}`;
        const storageRef = firebase.storage().ref(`${folderName}/${filename}`);
        
        await storageRef.put(file);
        const downloadUrl = await storageRef.getDownloadURL();
        
        console.log('[v0] File uploaded:', filename);
        return downloadUrl;
    } catch (error) {
        console.error('[v0] Error uploading file:', error);
        throw error;
    }
}

function showSuccessMessage(nominationData) {
    console.log('[v0] Showing success message');
    
    const successDetails = document.getElementById('successDetails');
    successDetails.innerHTML = `
        <strong>Nomination ID:</strong> ${formData.email}<br>
        <strong>Posts Nominated:</strong> ${formData.posts.join(', ')}<br>
        <strong>Submitted:</strong> ${new Date().toLocaleString()}
    `;

    goToStep('success');
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'none';
    document.getElementById('successMessage').style.display = 'block';
    document.getElementById('progressFill').style.width = '100%';
}

function resetForm() {
    console.log('[v0] Resetting form');
    
    // Reset all form data
    formData = {
        email: '',
        studentName: '',
        studentId: '',
        classYear: '',
        posts: [],
        photo: null,
        photoFile: null,
        resumePdf: null,
        resumePdfFile: null,
        statement: ''
    };

    // Clear all form inputs
    document.getElementById('step1Form').reset();
    document.getElementById('step2Form').reset();
    document.getElementById('step3Form').reset();

    // Clear file previews
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('pdfPreview').style.display = 'none';
    document.getElementById('charCount').textContent = '0';

    // Go back to step 1
    goToStep(1);
}

// ============================================
// ADMIN LOGIN MODAL
// ============================================

function openLoginModal() {
    console.log('[v0] Opening login modal');
    document.getElementById('adminLoginModal').style.display = 'block';
}

function closeModal() {
    console.log('[v0] Closing modal');
    document.getElementById('adminLoginModal').style.display = 'none';
    document.getElementById('nominationModal').style.display = 'none';
}

function loginAdmin(event) {
    event.preventDefault();
    console.log('[v0] Admin login attempt');

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('[v0] Admin logged in:', userCredential.user.email);
            closeModal();
            // Redirect to admin dashboard
            window.location.href = 'admin.html';
        })
        .catch((error) => {
            console.error('[v0] Login error:', error);
            showToast('Invalid email or password', 'error');
        });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 4000);
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('adminLoginModal');
    if (event.target === modal) {
        closeModal();
    }
}

console.log('[v0] Student portal app.js loaded');
