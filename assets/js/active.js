/*
 ** ACTIVE.JS - UI Activation for Palestine Crisis
 ** This file bridges the old function calls with the new data managers
 */
// Stats, pie and line charts are rendered once by app.js; this file only keeps the
// "last updated" labels current.
document.addEventListener('DOMContentLoaded', async function () {
    await appReady;
    updateAllLastUpdateElements();
    // Update every minute
    setInterval(updateAllLastUpdateElements, 60000);
});

// Function to update all last-update elements on the page
function updateAllLastUpdateElements() {
    if (!liveTracker || !liveTracker.data) return;
    
    // Find ALL .last-update elements on the page
    const allLastUpdateElements = document.querySelectorAll('.last-update');
    const updateTime = liveTracker.getLastUpdateTime();
    
    
    allLastUpdateElements.forEach(function (elem) {
        updateLastUpdateElement(elem, updateTime);
    });
}

// Helper function to update a single last-update element
function updateLastUpdateElement(elem, updateTime) {
    // Get the parent <p> element
    const parentP = elem.closest('p');
    // "2 days ago" / "قبل يومين" in the page language (getLocale is from app.js)
    const locale = typeof getLocale === 'function' ? getLocale() : 'en-US';
    const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });

    if (updateTime >= 1440) {
        // More than 24 hours (1440 minutes) - show full date
        const days = Math.floor(updateTime / 1440);
        const lastUpdateDate = new Date(liveTracker.data.last_update);
        const formattedDate = lastUpdateDate.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = lastUpdateDate.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        // Just update the .last-update span content
        elem.textContent = formattedDate + ' ' + formattedTime + ' (' + relativeTime.format(-days, 'day') + ')';
        
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
        elem.textContent = relativeTime.format(-hours, 'hour');
        
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
