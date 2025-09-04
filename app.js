// Constants
const WEEK_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_WEEK_OPTIONS = ["first", "second", "third", "fourth", "last"];
const RECURRENCE_TYPES = ["daily", "weekly", "monthly", "yearly"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// State
let state = {
    recurrenceType: 'weekly',
    interval: 1,
    weekDays: [1], // Monday by default
    monthDay: 1,
    monthWeek: null,
    monthWeekDay: null,
    startDate: new Date(2025, 8, 4), // September 04, 2025
    endType: 'never',
    endDate: null,
    endOccurrences: 10
};

let currentMonth = new Date(state.startDate);

// Utility functions (copied from app.js)
const generateRecurringDates = (config, maxDates = 50) => {
    const dates = [];
    const { recurrenceType, interval, weekDays, monthDay, monthWeek, monthWeekDay, startDate, endType, endDate, endOccurrences } = config;
    
    let currentDate = new Date(startDate);
    let count = 0;
    const maxIterations = 1000;

    const shouldAddDate = (date) => {
        if (endType === 'never') return true;
        if (endType === 'after' && count >= endOccurrences) return false;
        if (endType === 'on' && endDate && date > endDate) return false;
        return true;
    };

    const getNthWeekdayOfMonth = (year, month, weekday, nth) => {
        const firstDay = new Date(year, month, 1);
        const firstWeekday = firstDay.getDay();
        
        let targetDate;
        if (nth === 'last') {
            const lastDay = new Date(year, month + 1, 0);
            const lastWeekday = lastDay.getDay();
            const daysBack = (lastWeekday - weekday + 7) % 7;
            targetDate = new Date(year, month, lastDay.getDate() - daysBack);
        } else {
            const nthMap = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
            const occurrence = nthMap[nth];
            const daysToAdd = (weekday - firstWeekday + 7) % 7;
            const targetDay = 1 + daysToAdd + (occurrence - 1) * 7;
            targetDate = new Date(year, month, targetDay);
            if (targetDate.getMonth() !== month) {
                return null;
            }
        }
        
        return targetDate;
    };

    while (dates.length < maxDates && count < maxIterations) {
        let shouldAdd = false;
        
        switch (recurrenceType) {
            case 'daily':
                shouldAdd = true;
                break;
            case 'weekly':
                shouldAdd = weekDays.includes(currentDate.getDay());
                break;
            case 'monthly':
                if (monthWeek && monthWeekDay) {
                    const weekdayNum = WEEK_DAY_NAMES.findIndex(day => day.toLowerCase() === monthWeekDay);
                    const targetDate = getNthWeekdayOfMonth(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        weekdayNum,
                        monthWeek
                    );
                    shouldAdd = targetDate && currentDate.toDateString() === targetDate.toDateString();
                } else {
                    shouldAdd = currentDate.getDate() === monthDay;
                }
                break;
            case 'yearly':
                const startMonth = startDate.getMonth();
                const startDay = startDate.getDate();
                shouldAdd = currentDate.getMonth() === startMonth && currentDate.getDate() === startDay;
                break;
        }

        if (shouldAdd && currentDate >= startDate && shouldAddDate(currentDate)) {
            dates.push(new Date(currentDate));
            count++;
        }

        switch (recurrenceType) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + interval);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 1);
                if (currentDate.getDay() === 0) {
                    currentDate.setDate(currentDate.getDate() + (interval - 1) * 7);
                }
                break;
            case 'monthly':
                if (monthWeek && monthWeekDay) {
                    currentDate.setMonth(currentDate.getMonth() + interval);
                    currentDate.setDate(1);
                } else {
                    currentDate.setMonth(currentDate.getMonth() + interval);
                    const targetDay = Math.min(monthDay, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
                    currentDate.setDate(targetDay);
                }
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + interval);
                break;
        }
        
        count++;
    }

    return dates;
};

const generatePatternText = (config) => {
    const { recurrenceType, interval, weekDays, monthDay, monthWeek, monthWeekDay, endType, endDate, endOccurrences } = config;
    
    let text = '';
    
    switch (recurrenceType) {
        case 'daily':
            text = interval === 1 ? 'Every day' : `Every ${interval} days`;
            break;
        case 'weekly':
            const dayNames = weekDays.map(day => WEEK_DAY_NAMES[day]);
            if (interval === 1) {
                text = `Every ${dayNames.join(', ')}`;
            } else {
                text = `Every ${interval} weeks on ${dayNames.join(', ')}`;
            }
            break;
        case 'monthly':
            if (monthWeek && monthWeekDay) {
                const weekText = interval === 1 ? 'month' : `${interval} months`;
                text = `The ${monthWeek} ${monthWeekDay} of every ${weekText}`;
            } else {
                const dayText = `${monthDay}${getOrdinalSuffix(monthDay)}`;
                const monthText = interval === 1 ? 'month' : `${interval} months`;
                text = `The ${dayText} day of every ${monthText}`;
            }
            break;
        case 'yearly':
            const yearText = interval === 1 ? 'year' : `${interval} years`;
            text = `Every ${yearText}`;
            break;
    }
    
    switch (endType) {
        case 'on':
            if (endDate) {
                text += ` until ${endDate.toLocaleDateString()}`;
            }
            break;
        case 'after':
            text += ` for ${endOccurrences} occurrences`;
            break;
    }
    
    return text;
};

const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
};

// Update functions
function updateState(updates) {
    Object.assign(state, updates);
    updateUI();
}

function updateUI() {
    updateIntervalUnit();
    updateOptionsVisibility();
    updateMonthlyOptions();
    updateEndConditionVisibility();
    updateCalendarPreview();
    updatePatternSummary();
}

function updateIntervalUnit() {
    const unitSpan = document.getElementById('interval-unit');
    let unit = '';
    switch (state.recurrenceType) {
        case 'daily': unit = state.interval === 1 ? 'day' : 'days'; break;
        case 'weekly': unit = state.interval === 1 ? 'week' : 'weeks'; break;
        case 'monthly': unit = state.interval === 1 ? 'month' : 'months'; break;
        case 'yearly': unit = state.interval === 1 ? 'year' : 'years'; break;
    }
    unitSpan.textContent = unit;
}

function updateOptionsVisibility() {
    document.getElementById('weekly-options').classList.toggle('hidden', state.recurrenceType !== 'weekly');
    document.getElementById('monthly-options').classList.toggle('hidden', state.recurrenceType !== 'monthly');
}

function updateMonthlyOptions() {
    if (state.recurrenceType !== 'monthly') return;
    const dayRadio = document.querySelector('input[name="monthlyType"][value="day"]');
    const weekdayRadio = document.querySelector('input[name="monthlyType"][value="weekday"]');
    const monthWeekSelect = document.getElementById('month-week-select');
    const monthWeekDaySelect = document.getElementById('month-week-day-select');
    
    if (state.monthWeek && state.monthWeekDay) {
        weekdayRadio.checked = true;
        monthWeekSelect.disabled = false;
        monthWeekDaySelect.disabled = false;
        monthWeekSelect.value = state.monthWeek;
        monthWeekDaySelect.value = state.monthWeekDay;
    } else {
        dayRadio.checked = true;
        monthWeekSelect.disabled = true;
        monthWeekDaySelect.disabled = true;
    }
}

function updateEndConditionVisibility() {
    document.getElementById('end-date-container').classList.toggle('hidden', state.endType !== 'on');
    document.getElementById('end-occurrences-container').classList.toggle('hidden', state.endType !== 'after');
}

function updateCalendarPreview() {
    // Update header
    const header = document.getElementById('calendar-header');
    header.innerHTML = `
        <button class="calendar-nav-btn" id="prev-month">←</button>
        <h4 class="font-semibold">${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}</h4>
        <button class="calendar-nav-btn" id="next-month">→</button>
    `;

    // Add listeners (since innerHTML resets)
    document.getElementById('prev-month').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => navigateMonth(1));

    // Generate grid
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const days = getDaysInMonth(currentMonth);
    days.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = `calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isStartDate(day.date) ? 'start-date' : isRecurringDate(day.date) ? 'recurring' : ''}`;
        dayDiv.textContent = day.date.getDate();
        grid.appendChild(dayDiv);
    });
}

function getDaysInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
        days.push({
            date: new Date(currentDate),
            isCurrentMonth: currentDate.getMonth() === month,
            isToday: currentDate.toDateString() === new Date().toDateString()
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
}

function isRecurringDate(date) {
    const recurringDates = generateRecurringDates(state, 100);
    return recurringDates.some(recurDate => recurDate.toDateString() === date.toDateString());
}

function isStartDate(date) {
    return state.startDate.toDateString() === date.toDateString();
}

function navigateMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    updateCalendarPreview();
}

function updatePatternSummary() {
    const summary = document.getElementById('pattern-summary');
    const patternText = generatePatternText(state);
    const recurringDates = generateRecurringDates(state, 100);
    const upcomingDates = recurringDates.slice(0, 5);
    
    let html = `
        <h4 class="font-semibold mb-2">Pattern Summary</h4>
        <p class="text-sm mb-4">${patternText}</p>
    `;
    
    if (upcomingDates.length > 0) {
        html += `
            <div>
                <h5 class="font-medium mb-2 text-sm">Next occurrences:</h5>
                <ul class="text-xs space-y-1">
                    ${upcomingDates.map(date => `
                        <li>
                            ${date.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            })}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    summary.innerHTML = html;
}

// Event listeners setup
function init() {
    // Set initial values
    document.getElementById('interval-input').value = state.interval;
    document.getElementById('start-date-input').value = formatDateForInput(state.startDate);
    document.getElementById('end-occurrences-input').value = state.endOccurrences;
    document.getElementById('month-day-input').value = state.monthDay;

    // Recurrence type radios
    document.querySelectorAll('input[name="recurrenceType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateState({ recurrenceType: e.target.value });
        });
    });

    // Interval input
    document.getElementById('interval-input').addEventListener('change', (e) => {
        updateState({ interval: parseInt(e.target.value) || 1 });
    });

    // Weekday buttons
    document.querySelectorAll('.weekday-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const dayIndex = parseInt(btn.dataset.day);
            const newWeekDays = state.weekDays.includes(dayIndex)
                ? state.weekDays.filter(d => d !== dayIndex)
                : [...state.weekDays, dayIndex].sort((a, b) => a - b);
            if (newWeekDays.length > 0) {
                updateState({ weekDays: newWeekDays });
            }
            btn.classList.toggle('selected');
        });
    });

    // Monthly type radios
    document.querySelectorAll('input[name="monthlyType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'day') {
                updateState({ monthWeek: null, monthWeekDay: null });
            } else {
                updateState({ monthWeek: 'first', monthWeekDay: 'monday' });
            }
        });
    });

    // Month day input
    document.getElementById('month-day-input').addEventListener('change', (e) => {
        updateState({ monthDay: parseInt(e.target.value) || 1 });
    });

    // Month week select
    document.getElementById('month-week-select').addEventListener('change', (e) => {
        updateState({ monthWeek: e.target.value });
    });

    // Month week day select
    document.getElementById('month-week-day-select').addEventListener('change', (e) => {
        updateState({ monthWeekDay: e.target.value });
    });

    // Start date
    document.getElementById('start-date-input').addEventListener('change', (e) => {
        const date = new Date(e.target.value);
        updateState({ startDate: date });
        currentMonth = new Date(date);
        updateUI();
    });

    // End type radios
    document.querySelectorAll('input[name="endType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateState({ endType: e.target.value });
        });
    });

    // End date
    document.getElementById('end-date-input').addEventListener('change', (e) => {
        const date = e.target.value ? new Date(e.target.value) : null;
        updateState({ endDate: date });
    });

    // End occurrences
    document.getElementById('end-occurrences-input').addEventListener('change', (e) => {
        updateState({ endOccurrences: parseInt(e.target.value) || 1 });
    });

    // Initial update
    updateUI();
}

function formatDateForInput(date) {
    if (!date) return '';
    return date.toISOString().split('T')[0];
}

// Run init on load
document.addEventListener('DOMContentLoaded', init);
