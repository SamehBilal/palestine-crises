
// ============================================
// BARCODES.HTML PAGE SPECIFIC FUNCTIONALITY
// ============================================
// Number of bars in each drawn barcode; the page CSS styles bars 1-30 by position
const BARCODE_BARS = 30;
// Build one barcode: 30 bars, the prefix digits, and the country it belongs to
function createBarcode(entry) {
    const container = document.createElement('div');
    container.className = 'container-barcode';

    const barcode = document.createElement('div');
    barcode.className = 'barcode';
    for (let i = 0; i < BARCODE_BARS; i++) {
        barcode.appendChild(document.createElement('div'));
    }
    const prefix = document.createElement('p');
    prefix.textContent = entry.prefix;
    barcode.appendChild(prefix);

    const caption = document.createElement('p');
    caption.className = 'barcode-caption';
    caption.textContent = currentLang === 'ar' && entry.ar_name ? entry.ar_name : entry.name;

    container.appendChild(caption);
    container.appendChild(barcode);
    return container;
}
// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async function () {
    const list = document.getElementById('barcode-list');
    if (!list) return;
    try {
        const response = await fetch('data/barcodes.json');
        const barcodes = await response.json();
        barcodes.forEach(function (entry) {
            list.appendChild(createBarcode(entry));
        });
    } catch (error) {
        console.error('Error loading barcodes:', error);
    }
});
