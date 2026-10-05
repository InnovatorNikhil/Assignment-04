/**
 * CAMPUS HELP DESK - FRONTEND CONTROLLER
 * Technology Stack: Vanilla JavaScript + Native Fetch API
 * Assignment 04 Mini Project
 */

// ==========================================
// STATE MANAGEMENT
// ==========================================
let allRequests = [];
let activeStatusFilter = 'All';
let activeCategoryFilter = 'All';
let activeSearchQuery = '';
let deleteTargetId = null;
let autoRefreshTimer = null;

// ==========================================
// INITIALIZATION ON DOM READY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initial fetch of all campus requests
  fetchRequests();

  // Close modals when pressing the Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeDeleteModal();
      closeSettingsModal();
      toggleSidebar(false);
    }
  });
});

// ==========================================
// DATA FETCHING (GET /api/requests)
// ==========================================

/**
 * Fetches all requests from the Express backend via fetch() API.
 * @param {boolean} showToastFeedback - Optional toast on manual refresh
 */
async function fetchRequests(showToastFeedback = false) {
  const loadingEl = document.getElementById('requests-loading');
  const errorEl = document.getElementById('requests-error');
  const emptyEl = document.getElementById('requests-empty');
  const tableContainer = document.getElementById('table-container');
  const mobileContainer = document.getElementById('mobile-cards-container');
  const refreshSpinner = document.getElementById('refresh-spinner');

  if (refreshSpinner) refreshSpinner.classList.add('btn-loader');

  // Show loading indicator only on initial load if we don't have cached items
  if (allRequests.length === 0) {
    loadingEl.style.display = 'flex';
    errorEl.style.display = 'none';
    emptyEl.style.display = 'none';
    tableContainer.style.display = 'none';
    mobileContainer.style.display = 'none';
  }

  try {
    const response = await fetch('/api/requests', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const data = await response.json();
    allRequests = Array.isArray(data) ? data : [];

    // Sort requests by ID descending (newest first)
    allRequests.sort((a, b) => (b.id || 0) - (a.id || 0));

    // Update dynamic statistics and render UI
    updateStatistics(allRequests);
    renderRequests();

    if (showToastFeedback) {
      showToast('Requests refreshed successfully', 'info');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    loadingEl.style.display = 'none';
    tableContainer.style.display = 'none';
    mobileContainer.style.display = 'none';
    emptyEl.style.display = 'none';
    errorEl.style.display = 'flex';
    document.getElementById('error-message-text').textContent =
      'Could not connect to the backend server. Please verify Express server is running on port 3000.';
    showToast('Failed to load campus requests', 'error');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
    if (refreshSpinner) refreshSpinner.classList.remove('btn-loader');
  }
}

// ==========================================
// DYNAMIC STATISTICS CALCULATION
// ==========================================

/**
 * Calculates and updates the 4 statistic cards dynamically.
 * Values are derived directly from the backend data array.
 * @param {Array} requests - The list of all request objects
 */
function updateStatistics(requests) {
  const total = requests.length;
  const pending = requests.filter((r) => r.status === 'Pending').length;
  const inProgress = requests.filter((r) => r.status === 'In Progress').length;
  const resolved = requests.filter((r) => r.status === 'Resolved').length;

  // Animate counter values
  animateNumber('stat-total', total);
  animateNumber('stat-pending', pending);
  animateNumber('stat-in-progress', inProgress);
  animateNumber('stat-resolved', resolved);

  // Update sidebar counter badge
  const sidebarBadge = document.getElementById('nav-badge-total');
  if (sidebarBadge) {
    sidebarBadge.textContent = total;
  }
}

/**
 * Smoothly updates numerical text inside an element
 */
function animateNumber(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = targetValue;
}

// ==========================================
// RENDER REQUESTS LIST (TABLE & MOBILE CARDS)
// ==========================================

/**
 * Filters and renders requests to both desktop table and mobile cards view.
 */
function renderRequests() {
  const loadingEl = document.getElementById('requests-loading');
  const errorEl = document.getElementById('requests-error');
  const emptyEl = document.getElementById('requests-empty');
  const tableContainer = document.getElementById('table-container');
  const mobileContainer = document.getElementById('mobile-cards-container');
  const tableBody = document.getElementById('requests-table-body');

  loadingEl.style.display = 'none';
  errorEl.style.display = 'none';

  // Apply Active Filters (Status, Category, Search Query)
  const filtered = allRequests.filter((req) => {
    // 1. Status Filter
    if (activeStatusFilter !== 'All' && req.status !== activeStatusFilter) {
      return false;
    }
    // 2. Category Filter
    if (activeCategoryFilter !== 'All' && req.category !== activeCategoryFilter) {
      return false;
    }
    // 3. Search Query Filter
    if (activeSearchQuery.trim() !== '') {
      const q = activeSearchQuery.toLowerCase();
      const matchId = String(req.id).includes(q);
      const matchName = (req.studentName || '').toLowerCase().includes(q);
      const matchEmail = (req.email || '').toLowerCase().includes(q);
      const matchCategory = (req.category || '').toLowerCase().includes(q);
      const matchDesc = (req.description || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchEmail && !matchCategory && !matchDesc) {
        return false;
      }
    }
    return true;
  });

  // If no requests at all exist in the system
  if (allRequests.length === 0) {
    tableContainer.style.display = 'none';
    mobileContainer.style.display = 'none';
    emptyEl.style.display = 'flex';
    emptyEl.querySelector('h4').textContent = 'No requests yet.';
    emptyEl.querySelector('p').textContent = 'Submit your first campus request to get started.';
    return;
  }

  // If filter produces zero results
  if (filtered.length === 0) {
    tableContainer.style.display = 'none';
    mobileContainer.style.display = 'none';
    emptyEl.style.display = 'flex';
    emptyEl.querySelector('h4').textContent = 'No matching requests';
    emptyEl.querySelector('p').textContent = 'Try adjusting your search query or filter selection.';
    return;
  }

  // Hide empty state and show containers
  emptyEl.style.display = 'none';
  tableContainer.style.display = 'block';
  mobileContainer.style.display = 'flex';

  // Render Desktop Table Rows
  tableBody.innerHTML = filtered.map((req) => createTableRowHTML(req)).join('');

  // Render Mobile Cards
  mobileContainer.innerHTML = filtered.map((req) => createMobileCardHTML(req)).join('');
}

/**
 * Creates HTML for desktop table row
 */
function createTableRowHTML(req) {
  const dateFormatted = formatDate(req.createdAt);
  const priorityClass = getPriorityBadgeClass(req.priority);
  const statusClass = getStatusBadgeClass(req.status);

  return `
    <tr id="request-row-${req.id}">
      <td>
        <span class="req-id-badge">#${escapeHTML(String(req.id))}</span>
      </td>
      <td>
        <div class="student-meta">
          <span class="student-meta-name">${escapeHTML(req.studentName)}</span>
          <span class="student-meta-email">${escapeHTML(req.email)}</span>
        </div>
      </td>
      <td>
        <span class="category-chip">${escapeHTML(req.category)}</span>
      </td>
      <td>
        <div class="desc-text" title="${escapeHTML(req.description)}">
          ${escapeHTML(req.description)}
        </div>
      </td>
      <td>
        <span class="badge ${priorityClass}">
          <span class="badge-dot"></span>
          ${escapeHTML(req.priority)}
        </span>
      </td>
      <td>
        <span class="badge ${statusClass}">
          <span class="badge-dot"></span>
          ${escapeHTML(req.status)}
        </span>
      </td>
      <td>
        <span class="date-text">${dateFormatted}</span>
      </td>
      <td>
        <div class="action-buttons">
          <button 
            class="btn-action btn-action-edit" 
            title="Edit Request #${req.id}" 
            onclick="openEditModal(${req.id})"
            aria-label="Edit Request"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button 
            class="btn-action btn-action-delete" 
            title="Delete Request #${req.id}" 
            onclick="openDeleteModal(${req.id})"
            aria-label="Delete Request"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Creates HTML for mobile card view
 */
function createMobileCardHTML(req) {
  const dateFormatted = formatDate(req.createdAt);
  const priorityClass = getPriorityBadgeClass(req.priority);
  const statusClass = getStatusBadgeClass(req.status);

  return `
    <div class="request-mobile-card" id="request-card-${req.id}">
      <div class="mobile-card-top">
        <span class="req-id-badge">#${escapeHTML(String(req.id))}</span>
        <span class="badge ${statusClass}">
          <span class="badge-dot"></span>
          ${escapeHTML(req.status)}
        </span>
      </div>
      <div>
        <strong style="color: var(--color-text-main); font-size: 14.5px;">${escapeHTML(req.studentName)}</strong>
        <div style="font-size: 12px; color: var(--color-text-muted);">${escapeHTML(req.email)}</div>
      </div>
      <div class="mobile-card-body">
        ${escapeHTML(req.description)}
      </div>
      <div class="mobile-card-meta">
        <span class="category-chip">${escapeHTML(req.category)}</span>
        <span class="badge ${priorityClass}">
          <span class="badge-dot"></span>
          ${escapeHTML(req.priority)} Priority
        </span>
        <span class="date-text" style="margin-left: auto;">${dateFormatted}</span>
      </div>
      <div class="mobile-card-footer">
        <span style="font-size: 11px; color: var(--color-text-muted);">Actions:</span>
        <div class="action-buttons">
          <button class="btn btn-secondary btn-sm" onclick="openEditModal(${req.id})">
            Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${req.id})">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// SUBMIT NEW REQUEST (POST /api/requests)
// ==========================================

/**
 * Handles submission of the New Request form.
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const form = document.getElementById('new-request-form');
  const submitBtn = document.getElementById('btn-submit-request');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');
  const btnIcon = submitBtn.querySelector('.btn-icon');

  // Clear previous errors
  clearErrors('error-');

  // Extract Form Values
  const studentName = document.getElementById('studentName').value.trim();
  const email = document.getElementById('email').value.trim();
  const category = document.getElementById('category').value;
  const priority = document.getElementById('priority').value;
  const description = document.getElementById('description').value.trim();

  // Client Validation
  let isValid = true;

  if (!studentName) {
    showFieldError('error-studentName', 'Student name is required.');
    isValid = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    showFieldError('error-email', 'Student email is required.');
    isValid = false;
  } else if (!emailRegex.test(email)) {
    showFieldError('error-email', 'Please enter a valid email address.');
    isValid = false;
  }

  if (!category) {
    showFieldError('error-category', 'Please select a category.');
    isValid = false;
  }

  if (!priority) {
    showFieldError('error-priority', 'Please select a priority level.');
    isValid = false;
  }

  if (!description) {
    showFieldError('error-description', 'Problem description cannot be empty.');
    isValid = false;
  } else if (description.length < 10) {
    showFieldError('error-description', 'Please describe the problem with at least 10 characters.');
    isValid = false;
  }

  if (!isValid) return;

  // Prepare payload
  const newRequestPayload = {
    studentName,
    email,
    category,
    priority,
    description
  };

  // UI Loading State
  submitBtn.disabled = true;
  btnText.textContent = 'Submitting...';
  btnLoader.style.display = 'inline-block';
  if (btnIcon) btnIcon.style.display = 'none';

  try {
    // Send POST Request using native Fetch API
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newRequestPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create request');
    }

    // Success Handling
    showToast(`Request #${result.id} submitted successfully!`, 'success');
    resetNewForm();

    // Reload requests and update dynamic stats
    await fetchRequests();

    // Smooth scroll down to the recent requests section to see the new entry
    const requestsSection = document.getElementById('requests-section');
    if (requestsSection) {
      requestsSection.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (error) {
    console.error('Submit error:', error);
    showToast(error.message || 'Error submitting request. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Submit Request';
    btnLoader.style.display = 'none';
    if (btnIcon) btnIcon.style.display = 'inline-block';
  }
}

// ==========================================
// EDIT REQUEST (PUT /api/requests/:id)
// ==========================================

/**
 * Opens the Edit Modal and populates it with existing data for the selected request.
 */
function openEditModal(id) {
  const req = allRequests.find((r) => r.id === id);
  if (!req) {
    showToast('Request not found', 'error');
    return;
  }

  clearErrors('edit-error-');

  // Fill in form fields
  document.getElementById('edit-id').value = req.id;
  document.getElementById('edit-studentName').value = req.studentName || '';
  document.getElementById('edit-email').value = req.email || '';
  document.getElementById('edit-category').value = req.category || 'Other';
  document.getElementById('edit-priority').value = req.priority || 'Medium';
  document.getElementById('edit-status').value = req.status || 'Pending';
  document.getElementById('edit-description').value = req.description || '';

  // Show Modal
  const modal = document.getElementById('edit-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // prevent background scrolling
}

/**
 * Closes the Edit Modal
 */
function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

/**
 * Handles submitting the Edit Modal form via PUT /api/requests/:id
 */
async function handleEditFormSubmit(event) {
  event.preventDefault();

  clearErrors('edit-error-');

  const id = document.getElementById('edit-id').value;
  const studentName = document.getElementById('edit-studentName').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const category = document.getElementById('edit-category').value;
  const priority = document.getElementById('edit-priority').value;
  const status = document.getElementById('edit-status').value;
  const description = document.getElementById('edit-description').value.trim();

  // Validation
  let isValid = true;
  if (!studentName) {
    showFieldError('edit-error-studentName', 'Student name is required.');
    isValid = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showFieldError('edit-error-email', 'Valid email is required.');
    isValid = false;
  }

  if (!description) {
    showFieldError('edit-error-description', 'Description cannot be empty.');
    isValid = false;
  }

  if (!isValid) return;

  const updatePayload = {
    studentName,
    email,
    category,
    priority,
    status,
    description
  };

  const saveBtn = document.getElementById('btn-save-edit');
  const btnText = saveBtn.querySelector('.btn-text');
  const btnLoader = saveBtn.querySelector('.btn-loader');

  saveBtn.disabled = true;
  btnText.textContent = 'Saving...';
  btnLoader.style.display = 'inline-block';

  try {
    // Send PUT request using native Fetch API
    const response = await fetch(`/api/requests/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    const updatedData = await response.json();

    if (!response.ok) {
      throw new Error(updatedData.error || 'Failed to update request');
    }

    closeEditModal();
    showToast(`Request #${id} updated successfully!`, 'success');

    // Refresh requests list & update statistics
    await fetchRequests();
  } catch (error) {
    console.error('Update error:', error);
    showToast(error.message || 'Error updating request.', 'error');
  } finally {
    saveBtn.disabled = false;
    btnText.textContent = 'Save Changes';
    btnLoader.style.display = 'none';
  }
}

// ==========================================
// DELETE REQUEST (DELETE /api/requests/:id)
// ==========================================

/**
 * Opens delete confirmation dialog for a specific request ID.
 */
function openDeleteModal(id) {
  deleteTargetId = id;
  const label = document.getElementById('delete-request-id-label');
  if (label) label.textContent = `#${id}`;

  const modal = document.getElementById('delete-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Closes delete confirmation modal
 */
function closeDeleteModal() {
  deleteTargetId = null;
  const modal = document.getElementById('delete-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

/**
 * Executes the DELETE operation using fetch() API
 */
async function confirmDeleteRequest() {
  if (!deleteTargetId) return;

  const id = deleteTargetId;
  const deleteBtn = document.getElementById('btn-confirm-delete');
  const btnText = deleteBtn.querySelector('.btn-text');
  const btnLoader = deleteBtn.querySelector('.btn-loader');

  deleteBtn.disabled = true;
  btnText.textContent = 'Deleting...';
  btnLoader.style.display = 'inline-block';

  try {
    // Send DELETE request using native Fetch API
    const response = await fetch(`/api/requests/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete request');
    }

    closeDeleteModal();
    showToast(`Request #${id} deleted successfully`, 'success');

    // Refresh data and statistics
    await fetchRequests();
  } catch (error) {
    console.error('Delete error:', error);
    showToast(error.message || 'Error deleting request.', 'error');
  } finally {
    deleteBtn.disabled = false;
    btnText.textContent = 'Yes, Delete';
    btnLoader.style.display = 'none';
  }
}

// ==========================================
// FILTER & SEARCH HANDLERS
// ==========================================

/**
 * Filters requests by status pill (All, Pending, In Progress, Resolved)
 */
function filterByStatus(status) {
  activeStatusFilter = status;

  // Update active pill styling
  const pills = document.querySelectorAll('#status-filters .pill');
  pills.forEach((pill) => {
    if (pill.textContent.trim() === status) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  renderRequests();
}

/**
 * Filters requests by category dropdown
 */
function handleCategoryFilter(category) {
  activeCategoryFilter = category;
  renderRequests();
}

/**
 * Live search handler across student name, email, description, etc.
 */
function handleSearch(query) {
  activeSearchQuery = query;
  renderRequests();
}

// ==========================================
// UI HELPER FUNCTIONS
// ==========================================

function updateCharCount(textarea) {
  const count = textarea.value.length;
  const countEl = document.getElementById('char-count');
  if (countEl) {
    countEl.textContent = `${count} / 500`;
  }
}

function resetNewForm() {
  const form = document.getElementById('new-request-form');
  form.reset();
  clearErrors('error-');
  const countEl = document.getElementById('char-count');
  if (countEl) countEl.textContent = '0 / 500';
}

function showFieldError(elementId, message) {
  const errorEl = document.getElementById(elementId);
  if (errorEl) {
    errorEl.textContent = message;
    const inputWrapper = errorEl.previousElementSibling;
    if (inputWrapper) {
      const input = inputWrapper.querySelector('.form-control');
      if (input) input.classList.add('input-error');
    }
  }
}

function clearErrors(prefix) {
  const errorElements = document.querySelectorAll(`[id^="${prefix}"]`);
  errorElements.forEach((el) => {
    el.textContent = '';
  });
  document.querySelectorAll('.form-control.input-error').forEach((el) => {
    el.classList.remove('input-error');
  });
}

/**
 * Mobile Sidebar Drawer Toggle
 */
function toggleSidebar(forceState) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('open');
  const shouldOpen = forceState !== undefined ? forceState : !isOpen;

  if (shouldOpen) {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
  } else {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }
}

function setActiveNav(navId) {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
    item.classList.remove('active');
  });
  const activeEl = document.getElementById(navId);
  if (activeEl) activeEl.classList.add('active');

  // Close mobile sidebar if clicked on mobile
  if (window.innerWidth <= 992) {
    toggleSidebar(false);
  }
}

/**
 * Floating Toast Notification Generator
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSVG = '';
  if (type === 'success') {
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `
    <span>${iconSVG}</span>
    <span>${escapeHTML(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  // Auto remove toast after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }
  }, 4000);
}

// Badge CSS Class Mappings
function getPriorityBadgeClass(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'urgent': return 'badge-priority-urgent';
    case 'high': return 'badge-priority-high';
    case 'medium': return 'badge-priority-medium';
    case 'low': return 'badge-priority-low';
    default: return 'badge-priority-low';
  }
}

function getStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'resolved': return 'badge-status-resolved';
    case 'in progress': return 'badge-status-in-progress';
    case 'pending': return 'badge-status-pending';
    default: return 'badge-status-pending';
  }
}

/**
 * Format ISO Date nicely: e.g. "Sep 30, 2026"
 */
function formatDate(dateString) {
  if (!dateString) return 'Just now';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Simple HTML escape to prevent XSS
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Announcement toast for notification bell
function showAnnouncement() {
  showToast('Campus IT Maintenance scheduled for this Sunday 12:00 AM - 04:00 AM.', 'info');
}

// Settings Modal
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'flex';
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'none';
}

function toggleAutoRefresh(enabled) {
  if (enabled) {
    if (!autoRefreshTimer) {
      autoRefreshTimer = setInterval(() => fetchRequests(), 15000);
      showToast('Auto-refresh enabled (every 15s)', 'info');
    }
  } else {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
      showToast('Auto-refresh paused', 'info');
    }
  }
}

/**
 * Demo Helper: Seeds sample requests if desired
 */
async function seedSampleData() {
  const samples = [
    {
      studentName: 'Nikhil Dubey',
      email: 'student@example.com',
      category: 'IT Support',
      priority: 'High',
      description: 'WiFi is not connecting in Computer Lab 3 on the 2nd floor.'
    },
    {
      studentName: 'Aarav Sharma',
      email: 'aarav.sharma@campus.edu',
      category: 'Library',
      priority: 'Medium',
      description: 'Digital library access card barcode is unreadable and needs renewal.'
    },
    {
      studentName: 'Priya Patel',
      email: 'priya.p@campus.edu',
      category: 'Hostel',
      priority: 'Low',
      description: 'Hot water geyser in Block B, Room 204 has been repaired and verified.'
    }
  ];

  try {
    for (const sample of samples) {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sample)
      });
    }
    closeSettingsModal();
    showToast('Sample tickets seeded successfully!', 'success');
    await fetchRequests();
  } catch (err) {
    showToast('Error seeding sample data', 'error');
  }
}
