/*
 ** ACTIVE.JS - UI Activation for Palestine Crisis
 ** This file bridges the old function calls with the new data managers
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('Active.js initializing...');
    // Wait for data managers to be ready
    const waitForManagers = setInterval(function () {
        if (typeof liveTracker !== 'undefined' &&
            typeof attacksManager !== 'undefined' &&
            liveTracker.data &&
            attacksManager.attacks.length > 0) {
            clearInterval(waitForManagers);
            initializeActivations();
        }
    }, 100);
});

function initializeActivations() {
    console.log('Activating page elements...');
    
    /*
    ** Last Update Date Display - Initial Call
    */
    updateAllLastUpdateElements();
    
    // Update every minute
    setInterval(function() {
        updateAllLastUpdateElements();
    }, 60000);
    
    /*
    ** Worldwide Statistics Activation
    */
    const worldwide = document.querySelectorAll('.worldwide-stats');
    if (worldwide && worldwide.length > 0) {
        worldwide.forEach(function (item) {
            liveTracker.insertData(item);
        });
    }
    
    /*
    ** Map Statistics Report
    */
    const mapWiseReport = document.getElementById('map-status-report');
    if (mapWiseReport && typeof initializePalestineMap === 'function') {
        // This is handled in live.js
        console.log('Map initialization handled by live.js');
    }
    
    /*
    ** Chart Report Activation
    */
    const chartContainer = document.getElementById('chart-report');
    if (chartContainer && typeof chartReport === 'function') {
        chartReport(chartContainer);
    }
    
    /*
    ** Worldwide Stats with Pie Chart Activation
    */
    if (typeof worldwideWithPieChart === 'function' && liveTracker.data) {
        worldwideWithPieChart(liveTracker.data);
    }
    
    console.log('Active.js initialization complete!');
}

// Function to update all last-update elements on the page
function updateAllLastUpdateElements() {
    if (!liveTracker || !liveTracker.data) return;
    
    // Find ALL .last-update elements on the page
    const allLastUpdateElements = document.querySelectorAll('.last-update');
    const updateTime = liveTracker.getLastUpdateTime();
    
    console.log('Updating', allLastUpdateElements.length, 'last-update elements. Minutes:', updateTime);
    
    allLastUpdateElements.forEach(function (elem) {
        updateLastUpdateElement(elem, updateTime);
    });
}

// Helper function to update a single last-update element
function updateLastUpdateElement(elem, updateTime) {
    // Get the parent <p> element
    const parentP = elem.closest('p');
    
    if (updateTime >= 1440) {
        // More than 24 hours (1440 minutes) - show full date
        const days = Math.floor(updateTime / 1440);
        const lastUpdateDate = new Date(liveTracker.data.last_update);
        const formattedDate = lastUpdateDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = lastUpdateDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        // Just update the .last-update span content
        elem.textContent = formattedDate + ' ' + formattedTime + ' (' + days + ' day' + (days > 1 ? 's' : '') + ' ago)';
        
        // Hide the "minutes ago" span if it exists
        if (parentP) {
            const minutesAgoSpan = parentP.querySelector('[data-i18n="minutes ago"]');
            if (minutesAgoSpan) {
                minutesAgoSpan.style.display = 'none';
            }
        }
    } else if (updateTime >= 60) {
        // More than 60 minutes - show hours
        const hours = Math.floor(updateTime / 60);
        elem.textContent = hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
        
        // Hide the "minutes ago" span if it exists
        if (parentP) {
            const minutesAgoSpan = parentP.querySelector('[data-i18n="minutes ago"]');
            if (minutesAgoSpan) {
                minutesAgoSpan.style.display = 'none';
            }
        }
    } else {
        // Less than 60 minutes - show minutes
        elem.textContent = updateTime;
        
        // Show and populate the "minutes ago" span if it exists
        if (parentP) {
            const minutesAgoSpan = parentP.querySelector('[data-i18n="minutes ago"]');
            if (minutesAgoSpan) {
                minutesAgoSpan.style.display = '';
                const minutesText = (typeof i18n !== 'undefined' ? i18n.t('minutes ago') : 'minutes ago');
                // Make sure the span has content
                if (!minutesAgoSpan.textContent || minutesAgoSpan.textContent.trim() === '') {
                    minutesAgoSpan.textContent = minutesText;
                }
            } else {
                // If no "minutes ago" span exists, include it in the .last-update span
                elem.textContent = updateTime + ' ' + (typeof i18n !== 'undefined' ? i18n.t('minutes ago') : 'minutes ago');
            }
        }
    }
}

// OLD FUNCTION (kept for backward compatibility during transition)
function displayLastUpdate(container) {
    console.warn('displayLastUpdate(container) is deprecated. Updates now happen automatically.');
    updateAllLastUpdateElements();
}

// Compatibility stubs for old function names (in case they're called elsewhere)
function getLastUpdatedTime(element, format) {
    console.warn('getLastUpdatedTime is deprecated, using new displayLastUpdate');
    displayLastUpdate(element);
}

function worldwideReport(element) {
    console.warn('worldwideReport is deprecated, using liveTracker.insertData');
    if (liveTracker && liveTracker.data) {
        liveTracker.insertData(element);
    }
}

function countryReport(element, country) {
    console.warn('countryReport is deprecated');
    // Not needed in new system
}

function reportWithDropdown(element, country) {
    console.warn('reportWithDropdown is deprecated');
    // Handled by live.js
}

function mapStatus(element) {
    console.warn('mapStatus is deprecated');
    // Handled by live.js
}

function casesByCountry() {
    console.warn('casesByCountry is deprecated');
    // Handled by live.js
}

function reportListView(element, search) {
    console.warn('reportListView is deprecated');
    // Handled by live.js
}

function miniChart() {
    console.warn('miniChart is deprecated');
    // Not needed in new system
}

function mapReport(element, country) {
    console.warn('mapReport is deprecated');
    // Not needed in new system
}