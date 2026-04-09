// EmailJS Configuration
emailjs.init("YOUR_EMAILJS_PUBLIC_KEY"); // Get this from EmailJS dashboard

// Email Configuration Object
const EMAIL_CONFIG = {
    SERVICE_ID: "YOUR_EMAIL_SERVICE_ID",
    CONFIRMATION_TEMPLATE_ID: "YOUR_CONFIRMATION_TEMPLATE_ID",
    ADMIN_TEMPLATE_ID: "YOUR_ADMIN_TEMPLATE_ID"
};

// Function to send confirmation email to student
async function sendConfirmationEmail(email, studentName, posts, nominationDetails) {
    try {
        const templateParams = {
            to_email: email,
            student_name: studentName,
            posts_nominated: posts.join(', '),
            submission_time: new Date().toLocaleString(),
            nomination_id: nominationDetails.id
        };

        await emailjs.send(
            EMAIL_CONFIG.SERVICE_ID,
            EMAIL_CONFIG.CONFIRMATION_TEMPLATE_ID,
            templateParams
        );

        console.log('[v0] Confirmation email sent to:', email);
        return true;
    } catch (error) {
        console.error('[v0] Error sending email:', error);
        return false;
    }
}

// Function to send admin notification
async function sendAdminNotification(adminEmail, nominationData) {
    try {
        const templateParams = {
            to_email: adminEmail,
            student_name: nominationData.studentName,
            student_email: nominationData.email,
            posts_nominated: nominationData.posts.join(', '),
            submission_time: new Date().toLocaleString()
        };

        await emailjs.send(
            EMAIL_CONFIG.SERVICE_ID,
            EMAIL_CONFIG.ADMIN_TEMPLATE_ID,
            templateParams
        );

        console.log('[v0] Admin notification sent to:', adminEmail);
        return true;
    } catch (error) {
        console.error('[v0] Error sending admin notification:', error);
        return false;
    }
}

console.log('[v0] EmailJS initialized');
