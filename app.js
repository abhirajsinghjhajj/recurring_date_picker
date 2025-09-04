const { useState, useContext, createContext, useEffect, useMemo } = React;

// Sample data
const SAMPLE_PATTERNS = [
  {
    name: "Every weekday",
    type: "weekly", 
    weekDays: [1,2,3,4,5],
    interval: 1
  },
  {
    name: "Every 2 weeks on Monday and Friday",
    type: "weekly",
    weekDays: [1,5], 
    interval: 2
  },
  {
    name: "15th of every month",
    type: "monthly",
    monthDay: 15,
    interval: 1
  },
  {
    name: "Second Tuesday of every month", 
    type: "monthly",
    monthWeek: "second",
    monthWeekDay: "tuesday",
    interval: 1
  }
];

const WEEK_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_WEEK_OPTIONS = ["first", "second", "third", "fourth", "last"];
const RECURRENCE_TYPES = [
  {value: "daily", label: "Daily"},
  {value: "weekly", label: "Weekly"}, 
  {value: "monthly", label: "Monthly"},
  {value: "yearly", label: "Yearly"}
];

// Context for managing recurring date picker state
const RecurrenceContext = createContext();

const RecurrenceProvider = ({ children }) => {
  const [state, setState] = useState({
    recurrenceType: 'weekly',
    interval: 1,
    weekDays: [1], // Monday by default
    monthDay: 1,
    monthWeek: 'first',
    monthWeekDay: 'monday',
    startDate: new Date(),
    endType: 'never',
    endDate: null,
    endOccurrences: 10
  });

  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return (
    <RecurrenceContext.Provider value={{ state, updateState }}>
      {children}
    </RecurrenceContext.Provider>
  );
};

// Utility functions for date calculations
const generateRecurringDates = (config, maxDates = 50) => {
  const dates = [];
  const { recurrenceType, interval, weekDays, monthDay, monthWeek, monthWeekDay, startDate, endType, endDate, endOccurrences } = config;
  
  let currentDate = new Date(startDate);
  let count = 0;
  const maxIterations = 1000; // Prevent infinite loops

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
      // Find last occurrence
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
      
      // Check if the target date is still within the month
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

    // Move to next date based on recurrence type
    switch (recurrenceType) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 1);
        // Skip to next interval after completing a week cycle
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
          // Handle month end edge cases
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
  
  // Add end condition
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

// Component for selecting recurrence type
const RecurrenceTypeSelector = () => {
  const { state, updateState } = useContext(RecurrenceContext);
  
  return (
    <div className="mb-6">
      <h3 className="section-title">Recurrence Type</h3>
      <div className="radio-group">
        {RECURRENCE_TYPES.map(type => (
          <label key={type.value} className="radio-option">
            <input
              type="radio"
              name="recurrenceType"
              value={type.value}
              checked={state.recurrenceType === type.value}
              onChange={(e) => updateState({ recurrenceType: e.target.value })}
            />
            <span>{type.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

// Component for recurrence-specific options
const RecurrenceOptions = () => {
  const { state, updateState } = useContext(RecurrenceContext);
  
  const handleWeekDayToggle = (dayIndex) => {
    const newWeekDays = state.weekDays.includes(dayIndex)
      ? state.weekDays.filter(d => d !== dayIndex)
      : [...state.weekDays, dayIndex].sort((a, b) => a - b);
    
    if (newWeekDays.length > 0) {
      updateState({ weekDays: newWeekDays });
    }
  };

  return (
    <div className="mb-6">
      <h3 className="section-title">Options</h3>
      
      {/* Interval setting for all types */}
      <div className="form-row">
        <label>Every</label>
        <input
          type="number"
          min="1"
          max="100"
          value={state.interval}
          onChange={(e) => updateState({ interval: parseInt(e.target.value) || 1 })}
          className="form-control"
          style={{ width: '80px' }}
        />
        <span>
          {state.recurrenceType === 'daily' && (state.interval === 1 ? 'day' : 'days')}
          {state.recurrenceType === 'weekly' && (state.interval === 1 ? 'week' : 'weeks')}
          {state.recurrenceType === 'monthly' && (state.interval === 1 ? 'month' : 'months')}
          {state.recurrenceType === 'yearly' && (state.interval === 1 ? 'year' : 'years')}
        </span>
      </div>

      {/* Weekly specific options */}
      {state.recurrenceType === 'weekly' && (
        <div>
          <label className="form-label">Days of the week</label>
          <div className="weekday-selector">
            {WEEK_DAY_NAMES.map((day, index) => (
              <button
                key={index}
                type="button"
                className={`weekday-button ${state.weekDays.includes(index) ? 'selected' : ''}`}
                onClick={() => handleWeekDayToggle(index)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly specific options */}
      {state.recurrenceType === 'monthly' && (
        <div>
          <div className="form-row">
            <label>
              <input
                type="radio"
                name="monthlyType"
                value="day"
                checked={!state.monthWeek}
                onChange={() => updateState({ monthWeek: null, monthWeekDay: null })}
              />
              <span style={{ marginLeft: '6px' }}>On day</span>
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={state.monthDay}
              onChange={(e) => updateState({ monthDay: parseInt(e.target.value) || 1 })}
              className="form-control"
              style={{ width: '80px' }}
            />
            <span>of the month</span>
          </div>
          
          <div className="form-row">
            <label>
              <input
                type="radio"
                name="monthlyType"
                value="weekday"
                checked={!!state.monthWeek}
                onChange={() => updateState({ monthWeek: 'first', monthWeekDay: 'monday' })}
              />
              <span style={{ marginLeft: '6px' }}>On the</span>
            </label>
            <select
              value={state.monthWeek || 'first'}
              onChange={(e) => updateState({ monthWeek: e.target.value })}
              className="form-control"
              disabled={!state.monthWeek}
            >
              {MONTH_WEEK_OPTIONS.map(week => (
                <option key={week} value={week}>
                  {week.charAt(0).toUpperCase() + week.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={state.monthWeekDay || 'monday'}
              onChange={(e) => updateState({ monthWeekDay: e.target.value })}
              className="form-control"
              disabled={!state.monthWeek}
            >
              {WEEK_DAY_NAMES.map(day => (
                <option key={day.toLowerCase()} value={day.toLowerCase()}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Component for setting date range
const DateRangePicker = () => {
  const { state, updateState } = useContext(RecurrenceContext);
  
  const formatDateForInput = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  const handleStartDateChange = (e) => {
    const date = new Date(e.target.value);
    updateState({ startDate: date });
  };
  
  const handleEndDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    updateState({ endDate: date });
  };

  return (
    <div className="mb-6">
      <h3 className="section-title">Date Range</h3>
      
      <div className="form-group">
        <label className="form-label">Start Date</label>
        <input
          type="date"
          value={formatDateForInput(state.startDate)}
          onChange={handleStartDateChange}
          className="form-control"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">End Condition</label>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              name="endType"
              value="never"
              checked={state.endType === 'never'}
              onChange={(e) => updateState({ endType: e.target.value })}
            />
            <span>Never ends</span>
          </label>
          
          <label className="radio-option">
            <input
              type="radio"
              name="endType"
              value="on"
              checked={state.endType === 'on'}
              onChange={(e) => updateState({ endType: e.target.value })}
            />
            <span>On date</span>
          </label>
          
          <label className="radio-option">
            <input
              type="radio"
              name="endType"
              value="after"
              checked={state.endType === 'after'}
              onChange={(e) => updateState({ endType: e.target.value })}
            />
            <span>After occurrences</span>
          </label>
        </div>
        
        {state.endType === 'on' && (
          <input
            type="date"
            value={formatDateForInput(state.endDate)}
            onChange={handleEndDateChange}
            className="form-control mt-2"
          />
        )}
        
        {state.endType === 'after' && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              min="1"
              max="1000"
              value={state.endOccurrences}
              onChange={(e) => updateState({ endOccurrences: parseInt(e.target.value) || 1 })}
              className="form-control"
              style={{ width: '100px' }}
            />
            <span>occurrences</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Mini calendar preview component
const CalendarPreview = ({ recurringDates }) => {
  const { state } = useContext(RecurrenceContext);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 6 weeks of days (42 days)
    for (let i = 0; i < 42; i++) {
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === new Date().toDateString()
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };
  
  const isRecurringDate = (date) => {
    return recurringDates.some(recurDate => 
      recurDate.toDateString() === date.toDateString()
    );
  };
  
  const isStartDate = (date) => {
    return state.startDate.toDateString() === date.toDateString();
  };
  
  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };
  
  const days = getDaysInMonth(currentMonth);

  return (
    <div className="mb-6">
      <h3 className="section-title">Calendar Preview</h3>
      <div className="card">
        <div className="card__body">
          <div className="calendar-header">
            <button 
              className="calendar-nav-btn"
              onClick={() => navigateMonth(-1)}
            >
              ←
            </button>
            <h4 className="font-semibold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button 
              className="calendar-nav-btn"
              onClick={() => navigateMonth(1)}
            >
              →
            </button>
          </div>
          
          <div className="calendar-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>
          
          <div className="calendar-grid">
            {days.map((day, index) => {
              const isRecurring = isRecurringDate(day.date);
              const isStart = isStartDate(day.date);
              
              return (
                <div
                  key={index}
                  className={`calendar-day ${
                    !day.isCurrentMonth ? 'other-month' : ''
                  } ${isStart ? 'start-date' : isRecurring ? 'recurring' : ''}`}
                >
                  {day.date.getDate()}
                </div>
              );
            })}
          </div>
          
          <div className="preview-legend">
            <div className="legend-item">
              <div className="legend-dot start"></div>
              <span>Start Date</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot recurring"></div>
              <span>Recurring Dates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pattern summary component
const PatternSummary = ({ patternText, recurringDates }) => {
  const upcomingDates = recurringDates.slice(0, 5);
  
  return (
    <div className="pattern-preview">
      <h4 className="font-semibold mb-2">Pattern Summary</h4>
      <p className="text-sm mb-4">{patternText}</p>
      
      {upcomingDates.length > 0 && (
        <div>
          <h5 className="font-medium mb-2 text-sm">Next occurrences:</h5>
          <ul className="text-xs space-y-1">
            {upcomingDates.map((date, index) => (
              <li key={index}>
                {date.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Main app component
const App = () => {
  const { state } = useContext(RecurrenceContext);
  
  const recurringDates = useMemo(() => {
    return generateRecurringDates(state, 100);
  }, [state]);
  
  const patternText = useMemo(() => {
    return generatePatternText(state);
  }, [state]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Recurring Date Picker
            </h1>
            <p className="text-gray-600">
              Create and preview recurring date patterns
            </p>
          </header>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Configuration */}
            <div className="card">
              <div className="card__body">
                <RecurrenceTypeSelector />
                <div className="divider"></div>
                <RecurrenceOptions />
                <div className="divider"></div>
                <DateRangePicker />
              </div>
            </div>
            
            {/* Right Panel - Preview */}
            <div>
              <CalendarPreview recurringDates={recurringDates} />
            </div>
          </div>
          
          {/* Pattern Summary */}
          <div className="mt-8">
            <PatternSummary 
              patternText={patternText}
              recurringDates={recurringDates}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Main render function
const RecurringDatePicker = () => {
  return (
    <RecurrenceProvider>
      <App />
    </RecurrenceProvider>
  );
};

// Render the app
ReactDOM.render(<RecurringDatePicker />, document.getElementById('root'));
