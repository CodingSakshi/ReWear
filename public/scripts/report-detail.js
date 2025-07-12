// Wait until the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const downloadButton = document.getElementById('download-button');

    downloadButton.addEventListener('click', () => {
        // Select the part of the document you want to convert to PDF
        const reportElement = document.getElementById('report-card');
        
        // Configure the PDF options
        const opt = {
            margin:       0.5,
            filename:     'report.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Convert the selected element into a PDF
        html2pdf().from(reportElement).set(opt).save();
    });
});
