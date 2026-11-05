const TripRepository = require('./js/data/TripRepository');
const Trip = require('./js/models/Trip');

// State
let tripRepository;
let pendingDeleteTripId = null;
let attachedRecommendations = [];
let currentCountryCode = '';
let currentTripCurrency = 'RM';
let toastTimeout = null;

// DOM Elements
const tripsBadge = document.getElementById('tripsBadge');
const appToast = document.getElementById('appToast');
const tripsMessage = document.getElementById('tripsMessage');
const tripsEmptyState = document.getElementById('tripsEmptyState');
const tripsGrid = document.getElementById('tripsGrid');

const tripModal = document.getElementById('tripModal');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const tripForm = document.getElementById('tripForm');
const tripIdInput = document.getElementById('tripId');
const formDestinationName = document.getElementById('formDestinationName');
const formCountry = document.getElementById('formCountry');
const formTravelDate = document.getElementById('formTravelDate');
const formDuration = document.getElementById('formDuration');
const formTravelers = document.getElementById('formTravelers');
const formBudget = document.getElementById('formBudget');
const formNotes = document.getElementById('formNotes');
const formRecommendationsPreview = document.getElementById('formRecommendationsPreview');
const formErrorMessage = document.getElementById('formErrorMessage');

const deleteModal = document.getElementById('deleteModal');
const deleteTripDestination = document.getElementById('deleteTripDestination');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const deleteModalCloseBtn = document.getElementById('deleteModalCloseBtn');

function showToast(message, type) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  appToast.textContent = message;
  appToast.className = `app-toast toast-${type}`;
  appToast.hidden = false;

  toastTimeout = setTimeout(() => {
    appToast.hidden = true;
  }, 4000);
}

function updateTripsBadge() {
  const count = tripRepository.getAll().length;
  tripsBadge.textContent = String(count);
  tripsBadge.hidden = count === 0;
}

function renderTripsList() {
  tripsGrid.textContent = '';
  tripsMessage.textContent = '';
  tripsMessage.className = 'message';

  let trips = [];
  try {
    trips = tripRepository.getAll();
  } catch (error) {
    tripsMessage.textContent = `Failed to load saved trips: ${error.message}`;
    tripsMessage.className = 'message error-text';
    tripsEmptyState.hidden = true;
    tripsGrid.hidden = true;
    return;
  }

  updateTripsBadge();

  if (trips.length === 0) {
    tripsEmptyState.hidden = false;
    tripsGrid.hidden = true;
    return;
  }

  tripsEmptyState.hidden = true;
  tripsGrid.hidden = false;

  for (const trip of trips) {
    tripsGrid.appendChild(createTripCard(trip));
  }
}

function createTripCard(trip) {
  const card = document.createElement('article');
  card.className = 'trip-card';
  card.dataset.tripId = trip.id;

  const type = trip.destinationType || 'Trip Itinerary';
  const country = trip.country || trip.countryCode || '';
  const countryBadgeHtml = country
    ? `<span class="trip-country-tag"><span class="material-symbols-sharp tag-icon">location_on</span>${country}</span>`
    : '';

  const notesHtml = trip.notes
    ? `<div class="trip-notes">
        <div class="trip-notes-title">
          <span class="material-symbols-sharp note-icon">sticky_note_2</span>
          <span>Notes</span>
        </div>
        <div class="trip-notes-content">${trip.notes}</div>
      </div>`
    : '';

  let recsHtml = '';
  if (trip.recommendations && trip.recommendations.length > 0) {
    const listHtml = trip.recommendations
      .map(
        (r) =>
          `<li><strong>${r.title || 'Activity'}</strong>${r.description ? ` — <span>${r.description}</span>` : ''}</li>`
      )
      .join('');
    recsHtml = `
      <div class="trip-recs-section">
        <div class="trip-recs-header">
          <span class="material-symbols-sharp rec-icon">local_activity</span>
          <h4>Activities (${trip.recommendations.length})</h4>
        </div>
        <ul class="trip-recs-list">${listHtml}</ul>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="trip-card-header">
      <div class="trip-card-heading">
        <span class="trip-card-type">${type}</span>
        <h3 class="trip-card-title">${trip.destinationName}</h3>
      </div>
      ${countryBadgeHtml}
    </div>
    <div class="trip-meta-grid">
      <div class="trip-meta-item">
        <span class="meta-label"><span class="material-symbols-sharp meta-icon">calendar_today</span>Date</span>
        <span class="meta-val">${trip.getFormattedDate()}</span>
      </div>
      <div class="trip-meta-item">
        <span class="meta-label"><span class="material-symbols-sharp meta-icon">schedule</span>Duration</span>
        <span class="meta-val">${trip.durationDays} ${trip.durationDays === 1 ? 'day' : 'days'}</span>
      </div>
      <div class="trip-meta-item">
        <span class="meta-label"><span class="material-symbols-sharp meta-icon">group</span>Travelers</span>
        <span class="meta-val">${trip.travelers} ${trip.travelers === 1 ? 'person' : 'people'}</span>
      </div>
      <div class="trip-meta-item">
        <span class="meta-label"><span class="material-symbols-sharp meta-icon">payments</span>Budget</span>
        <span class="meta-val highlight-val">${trip.getFormattedBudget()}</span>
        <span class="trip-daily-budget">${trip.getFormattedDailyBudget()} / day</span>
      </div>
    </div>
    ${notesHtml}
    ${recsHtml}
    <div class="trip-card-actions">
      <button type="button" class="button-edit">
        <span class="material-symbols-sharp icon-sm">edit</span>
        <span>Edit</span>
      </button>
      <button type="button" class="button-delete">
        <span class="material-symbols-sharp icon-sm">delete</span>
        <span>Delete</span>
      </button>
    </div>
  `;

  card.querySelector('.button-edit').addEventListener('click', () => openEditTripModal(trip.id));
  card.querySelector('.button-delete').addEventListener('click', () => openDeleteModal(trip.id, trip.destinationName));

  return card;
}

function openEditTripModal(tripId) {
  const trip = tripRepository.getById(tripId);
  if (!trip) {
    showToast('Trip not found.', 'error');
    return;
  }

  tripForm.reset();
  formErrorMessage.textContent = '';
  formErrorMessage.hidden = true;

  modalTitle.textContent = 'Edit Trip Plan';
  tripIdInput.value = trip.id;
  formDestinationName.value = trip.destinationName;
  formCountry.value = trip.country || '';
  currentCountryCode = trip.countryCode || '';
  formTravelDate.value = trip.travelDate || '';
  formDuration.value = String(trip.durationDays);
  formTravelers.value = String(trip.travelers);
  formBudget.value = String(trip.budget);
  currentTripCurrency = trip.currency || 'RM';

  const prefixEl = tripForm.querySelector('.currency-prefix');
  if (prefixEl) {
    prefixEl.textContent = currentTripCurrency;
  }

  formNotes.value = trip.notes || '';
  attachedRecommendations = Array.isArray(trip.recommendations) ? [...trip.recommendations] : [];
  renderFormRecommendations();

  tripModal.hidden = false;
}

function renderFormRecommendations() {
  if (!attachedRecommendations || attachedRecommendations.length === 0) {
    formRecommendationsPreview.innerHTML = '<span class="text-muted">No recommendations attached.</span>';
    return;
  }

  const badgesHtml = attachedRecommendations
    .map((r) => `<span class="form-rec-chip">${r.title}</span>`)
    .join('');

  formRecommendationsPreview.innerHTML = `<div class="form-recs-badges">${badgesHtml}</div>`;
}

function closeTripModal() {
  tripModal.hidden = true;
  tripForm.reset();
  formErrorMessage.textContent = '';
  formErrorMessage.hidden = true;
}

function handleTripFormSubmit(e) {
  e.preventDefault();

  const tripId = tripIdInput.value;
  const existing = tripRepository.getById(tripId);

  const tripData = {
    destinationName: formDestinationName.value.trim(),
    destinationType: existing ? existing.destinationType : 'Destination',
    country: formCountry.value.trim(),
    countryCode: currentCountryCode.trim().toUpperCase(),
    travelDate: formTravelDate.value,
    durationDays: Number(formDuration.value),
    travelers: Number(formTravelers.value),
    budget: Number(formBudget.value),
    currency: currentTripCurrency,
    notes: formNotes.value.trim(),
    recommendations: attachedRecommendations,
  };

  const validation = Trip.validate(tripData);
  if (!validation.isValid) {
    formErrorMessage.innerHTML = validation.errors.join('<br>');
    formErrorMessage.hidden = false;
    return;
  }

  try {
    tripRepository.update(tripId, tripData);
    showToast(`Trip to "${tripData.destinationName}" successfully updated!`, 'success');
    closeTripModal();
    renderTripsList();
  } catch (error) {
    formErrorMessage.textContent = error.message;
    formErrorMessage.hidden = false;
  }
}

function openDeleteModal(tripId, destinationName) {
  pendingDeleteTripId = tripId;
  deleteTripDestination.textContent = destinationName || 'this trip';
  deleteModal.hidden = false;
}

function closeDeleteModal() {
  pendingDeleteTripId = null;
  deleteModal.hidden = true;
}

function handleConfirmDelete() {
  if (!pendingDeleteTripId) return;

  try {
    tripRepository.delete(pendingDeleteTripId);
    showToast('Trip deleted successfully.', 'success');
    closeDeleteModal();
    renderTripsList();
  } catch (error) {
    showToast(`Failed to delete trip: ${error.message}`, 'error');
    closeDeleteModal();
  }
}

function start() {
  tripRepository = new TripRepository();

  modalCloseBtn.addEventListener('click', closeTripModal);
  modalCancelBtn.addEventListener('click', closeTripModal);
  tripForm.addEventListener('submit', handleTripFormSubmit);

  deleteModalCloseBtn.addEventListener('click', closeDeleteModal);
  deleteCancelBtn.addEventListener('click', closeDeleteModal);
  deleteConfirmBtn.addEventListener('click', handleConfirmDelete);

  tripModal.addEventListener('click', (e) => {
    if (e.target === tripModal) closeTripModal();
  });

  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  renderTripsList();
}

try {
  start();
} catch (error) {
  if (tripsMessage) {
    tripsMessage.textContent = `Unable to start My Trips: ${error.message}`;
    tripsMessage.className = 'message error-text';
  }
}
