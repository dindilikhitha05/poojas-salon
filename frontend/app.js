// ==========================================
// CONFIGURATION & STATE
// ==========================================
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : ''; // Relative routing for combined Vercel deployment

const SERVICES = {
    haircut: { name: 'Haircut', duration: 45, price: 50 },
    coloring: { name: 'Hair Coloring', duration: 90, price: 120 },
    threading: { name: 'Threading (Eyebrows + Upper Lip)', duration: 15, price: 15 },
    facial: { name: 'Facial', duration: 60, price: 80 },
    spa: { name: 'Hair Spa', duration: 75, price: 70 }
};

// Operating Hours: 9:00 AM to 7:00 PM
const START_MINUTES = 9 * 60; // 540 minutes
const END_MINUTES = 19 * 60;  // 1140 minutes
const SLOT_INTERVAL = 30;     // 30 minutes

// In-memory Bookings Array (fetched from database)
let bookings = [];

// Selected time slot state
let selectedSlotMinutes = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeDates();
    loadBookings();
    
    // Set default view
    switchTab('book');
});

// Setup date input constraints
function initializeDates() {
    const today = new Date();
    const todayStr = formatDateLocal(today);
    
    // Set booking date constraints (Today to 30 days in future)
    const bookingDateInput = document.getElementById('booking-date');
    bookingDateInput.value = todayStr;
    bookingDateInput.min = todayStr;
    
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);
    bookingDateInput.max = formatDateLocal(maxDate);

    // Set dashboard date to today
    const dashboardDateInput = document.getElementById('dashboard-date');
    dashboardDateInput.value = todayStr;
}

// Local date formatter to YYYY-MM-DD (avoiding timezone shifts)
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==========================================
// REST API DATA LOADER
// ==========================================
async function loadBookings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings`);
        const result = await response.json();
        if (result.success) {
            bookings = result.data || [];
        } else {
            console.error('Failed to load bookings:', result.message);
        }
    } catch (err) {
        console.error('Error fetching bookings:', err);
    }
    renderDashboard();
}

// ==========================================
// TAB NAVIGATION
// ==========================================
// Navigate to a section inside the book view (show it if hidden, then scroll)
function navTo(sectionId) {
    // Make sure the main book section is visible
    document.getElementById('tab-book').classList.add('active');
    document.getElementById('tab-dashboard').classList.remove('active');
    document.getElementById('section-book').classList.add('active');
    document.getElementById('section-dashboard').classList.remove('active');

    // After display:block applies, scroll to target section
    setTimeout(() => {
        const target = document.getElementById(sectionId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 60);
}

function switchTab(tabId) {
    // Toggle Active Tab Buttons
    document.getElementById('tab-book').classList.toggle('active', tabId === 'book');
    document.getElementById('tab-dashboard').classList.toggle('active', tabId === 'dashboard');

    // Toggle Active Sections
    document.getElementById('section-book').classList.toggle('active', tabId === 'book');
    document.getElementById('section-dashboard').classList.toggle('active', tabId === 'dashboard');

    // Smooth scroll to the top of the newly revealed section
    const targetSection = document.getElementById(
        tabId === 'dashboard' ? 'section-dashboard' : 'section-book'
    );
    if (targetSection) {
        // Small delay to allow display toggle before scroll
        setTimeout(() => {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    if (tabId === 'dashboard') {
        renderDashboard();
    } else {
        onServiceOrDateChange();
    }
}

// ==========================================
// SLOT GENERATION & CONFLICT PREVENTION
// ==========================================
async function onServiceOrDateChange() {
    const serviceId = document.getElementById('service-select').value;
    const date = document.getElementById('booking-date').value;
    
    const slotsContainer = document.getElementById('slots-container');
    const slotsInstruction = document.getElementById('slots-instruction');
    const selectedTimeInput = document.getElementById('selected-time');
    
    // Reset selected slot
    selectedSlotMinutes = null;
    selectedTimeInput.value = '';

    if (!serviceId || !date) {
        slotsContainer.style.display = 'none';
        slotsInstruction.style.display = 'flex';
        slotsInstruction.innerHTML = '<i class="fa-solid fa-info-circle"></i> Please select a service and date to view available times.';
        return;
    }

    const service = SERVICES[serviceId];
    const duration = service.duration;

    // Generate potential slots
    const availableSlots = [];
    const todayStr = formatDateLocal(new Date());
    const isToday = (date === todayStr);
    
    // Get current time in minutes if booking for today
    let currentMinutes = 0;
    if (isToday) {
        const now = new Date();
        currentMinutes = now.getHours() * 60 + now.getMinutes();
    }

    // Fetch existing bookings for this date from the database
    let dayBookings = [];
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/date/${date}`);
        const result = await response.json();
        if (result.success) {
            dayBookings = result.data || [];
        } else {
            console.error('Failed to load date-specific bookings:', result.message);
        }
    } catch (err) {
        console.error('Error fetching date-specific bookings:', err);
    }

    for (let min = START_MINUTES; min < END_MINUTES; min += SLOT_INTERVAL) {
        const slotStart = min;
        const slotEnd = slotStart + duration;
        
        let isAvailable = true;
        let reason = '';

        // 1. Check if the service exceeds salon closing time
        if (slotEnd > END_MINUTES) {
            isAvailable = false;
            reason = 'exceeds-hours';
        }

        // 2. Check if the slot is in the past (for today's bookings)
        // We add a 15-minute buffer to prevent booking slots that start immediately
        if (isToday && slotStart <= currentMinutes + 15) {
            isAvailable = false;
            reason = 'past';
        }

        // 3. Check for overlaps with existing bookings
        if (isAvailable) {
            for (const booking of dayBookings) {
                // Overlap condition: StartA < EndB AND StartB < EndA
                if (slotStart < booking.endMinutes && booking.startMinutes < slotEnd) {
                    isAvailable = false;
                    reason = 'conflict';
                    break;
                }
            }
        }

        availableSlots.push({
            minutes: slotStart,
            timeString: minutesToTimeString(slotStart),
            isAvailable,
            reason
        });
    }

    // Render slots
    slotsInstruction.style.display = 'none';
    slotsContainer.style.display = 'grid';
    slotsContainer.innerHTML = '';

    if (availableSlots.filter(s => s.isAvailable).length === 0) {
        slotsContainer.style.display = 'none';
        slotsInstruction.style.display = 'flex';
        slotsInstruction.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> No slots available for this service on the selected date. Please try another day.';
        return;
    }

    availableSlots.forEach(slot => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.textContent = slot.timeString;
        
        if (!slot.isAvailable) {
            btn.disabled = true;
            btn.title = slot.reason === 'exceeds-hours' 
                ? 'Not enough time before closing' 
                : (slot.reason === 'past' ? 'This slot has passed' : 'This slot is already booked');
        } else {
            btn.addEventListener('click', () => selectSlot(btn, slot.minutes));
        }
        
        slotsContainer.appendChild(btn);
    });
}

function selectSlot(buttonElement, minutes) {
    // Remove selected class from all slots
    document.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('selected'));
    
    // Add selected class to clicked slot
    buttonElement.classList.add('selected');
    
    // Update state & hidden input
    selectedSlotMinutes = minutes;
    document.getElementById('selected-time').value = minutesToTimeString(minutes);
}

// Convert minutes from midnight to AM/PM string
function minutesToTimeString(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMins = String(mins).padStart(2, '0');
    return `${displayHours}:${displayMins} ${ampm}`;
}

// ==========================================
// BOOKING FORM SUBMISSION
// ==========================================
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const serviceId = document.getElementById('service-select').value;
    const date = document.getElementById('booking-date').value;
    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    
    if (!serviceId || !date || selectedSlotMinutes === null || !customerName || !customerPhone) {
        alert('Please complete all form fields and select an available time slot.');
        return;
    }

    const service = SERVICES[serviceId];
    const duration = service.duration;
    const price = service.price;
    const startMinutes = selectedSlotMinutes;
    const endMinutes = startMinutes + duration;

    // Create booking object
    const newBooking = {
        customerName,
        customerPhone,
        serviceId,
        serviceName: service.name,
        date,
        startMinutes,
        duration,
        endMinutes,
        price
    };

    // Save Booking to backend
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newBooking)
        });
        
        const result = await response.json();
        
        if (response.status === 409) {
            alert('Sorry, this slot was just booked by another customer. Please select another slot.');
            onServiceOrDateChange();
            return;
        }

        if (!response.ok || !result.success) {
            alert(`Booking failed: ${result.message || 'Unknown error'}`);
            return;
        }

        // Show Confirmation Modal
        showConfirmationModal(result.data);

        // Reset Form
        resetBookingForm();
    } catch (err) {
        console.error('Error creating booking:', err);
        alert('An error occurred while connecting to the server. Please try again.');
    }
}

function resetBookingForm() {
    document.getElementById('booking-form').reset();
    initializeDates();
    onServiceOrDateChange();
}

// ==========================================
// CONFIRMATION MODAL
// ==========================================
function showConfirmationModal(booking) {
    document.getElementById('confirm-name').textContent = booking.customerName;
    document.getElementById('confirm-service').textContent = booking.serviceName;
    
    // Format Date nicely
    const dateObj = new Date(booking.date);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('confirm-date').textContent = dateObj.toLocaleDateString('en-US', options);
    
    const timeStr = minutesToTimeString(booking.startMinutes);
    const endTimeStr = minutesToTimeString(booking.endMinutes);
    document.getElementById('confirm-time').textContent = `${timeStr} - ${endTimeStr}`;
    document.getElementById('confirm-duration').textContent = `${booking.duration} minutes`;

    document.getElementById('success-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('success-modal').classList.remove('active');
}

// ==========================================
// OWNER'S DASHBOARD
// ==========================================
async function renderDashboard() {
    const filterDate = document.getElementById('dashboard-date').value;
    const tbody = document.getElementById('appointments-tbody');
    const emptyState = document.getElementById('dashboard-empty');
    const dateBadge = document.getElementById('dashboard-date-badge');

    if (!filterDate) return;

    // Update Date Badge in Table Header
    const dateObj = new Date(filterDate);
    const todayStr = formatDateLocal(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateLocal(tomorrow);

    if (filterDate === todayStr) {
        dateBadge.textContent = 'Today';
    } else if (filterDate === tomorrowStr) {
        dateBadge.textContent = 'Tomorrow';
    } else {
        dateBadge.textContent = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Fetch daily bookings from the backend
    let dayBookings = [];
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/date/${filterDate}`);
        const result = await response.json();
        if (result.success) {
            dayBookings = result.data || [];
        } else {
            console.error('Failed to load dashboard bookings:', result.message);
        }
    } catch (err) {
        console.error('Error fetching dashboard bookings:', err);
    }

    // Calculate metrics
    let totalBookings = dayBookings.length;
    let totalRevenue = dayBookings.reduce((sum, b) => sum + b.price, 0);
    let totalMinutes = dayBookings.reduce((sum, b) => sum + b.duration, 0);
    
    // Format hours (e.g. 2h 15m or 1.5h)
    let totalHoursStr = '0h';
    if (totalMinutes > 0) {
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totalHoursStr = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }

    // Update Metrics DOM
    document.getElementById('stat-total-bookings').textContent = totalBookings;
    document.getElementById('stat-total-revenue').textContent = `$${totalRevenue}`;
    document.getElementById('stat-total-hours').textContent = totalHoursStr;

    // Render Table Rows
    tbody.innerHTML = '';
    
    if (dayBookings.length === 0) {
        tbody.parentElement.parentElement.style.display = 'none'; // hide table wrapper
        emptyState.style.display = 'block';
    } else {
        tbody.parentElement.parentElement.style.display = 'block'; // show table wrapper
        emptyState.style.display = 'none';

        dayBookings.forEach(booking => {
            const tr = document.createElement('tr');
            
            const timeStr = minutesToTimeString(booking.startMinutes);
            const endTimeStr = minutesToTimeString(booking.endMinutes);
            const bookingId = booking._id || booking.id;

            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--color-primary-dark);">${timeStr} - ${endTimeStr}</td>
                <td style="font-weight: 500;">${escapeHtml(booking.customerName)}</td>
                <td><a href="tel:${booking.customerPhone}" style="color: inherit; text-decoration: none;"><i class="fa-solid fa-phone" style="font-size: 0.8rem; color: var(--color-accent); margin-right: 6px;"></i>${escapeHtml(booking.customerPhone)}</a></td>
                <td><span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary-dark); border: 1px solid rgba(245,145,169,0.2);">${booking.serviceName}</span></td>
                <td>${booking.duration} mins</td>
                <td style="font-family: var(--font-serif); font-weight: 600; color: var(--color-accent-dark);">$${booking.price}</td>
                <td style="text-align: right;">
                    <button class="btn-cancel" onclick="cancelAppointment('${bookingId}')">
                        <i class="fa-regular fa-trash-can"></i> Cancel
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function cancelAppointment(id) {
    const booking = bookings.find(b => b._id === id || b.id === id);
    if (!booking) {
        // If not found in loaded array, check DOM or just fetch deletion
        console.warn('Booking object local lookup failed, proceeding with direct delete');
    }

    const name = booking ? booking.customerName : 'this booking';
    const confirmCancel = confirm(`Are you sure you want to cancel the appointment for ${name}?`);
    if (confirmCancel) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.success) {
                await loadBookings();
            } else {
                alert(`Cancellation failed: ${result.message}`);
            }
        } catch (err) {
            console.error('Error deleting booking:', err);
            alert('An error occurred while connecting to the server.');
        }
    }
}

// Utility to escape HTML and prevent XSS
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
