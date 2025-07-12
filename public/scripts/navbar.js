const activePage = window.location.pathname;
const navLinks = document.querySelectorAll('nav a');

// Determine if the current page is an account report detail page
const isAccountReportDetailPage = activePage.startsWith('/account/report/');

navLinks.forEach(link => {
    // Get the href attribute of the link and remove any query/fragment
    const linkPath = link.getAttribute('href').split('?')[0].split('#')[0];

    // Custom logic for activating 'Account' for '/account/report-detail/:id'
    if (isAccountReportDetailPage && linkPath.startsWith('/account/')) {
        link.classList.add('active');
    } 
    // Check for exact match for the homepage
    else if (activePage === '/' && linkPath === '/') {
        link.classList.add('active');
    } 
    // Default behavior: Check if the link's path is a sub-path of the current page
    else if (activePage.startsWith(linkPath) && linkPath !== '/') {
        link.classList.add('active');
    }
});




// for toggle Menu
function toggleMenu() {
    const dropdown = document.getElementById("navDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}
