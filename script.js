'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Classes of the Workout Data

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.eleveationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}

// const run1 = new Running([39, -12], 5.2, 30, 150);
// const cycling1 = new Cycling([39, -12], 27, 24, 120);
// console.log(run1, cycling1);

/////////////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Form submiting event
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Input Type Toggle Event
    inputType.addEventListener('change', this._toggleElevationField);

    // Moving to Popup
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // Geolocation
    // the first parameter is the success and the second one is the failed
    // the success parameter takes a callback called position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('failed');
        }
      );
    }
  }

  _loadMap(position) {
    console.log(position);
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    console.log(latitude, longitude);
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    // Displaying Map using Leaflet Library
    // The setView is expecting an array for the latitude and longitude
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Click Map on event
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workOuts => {
      this._renderWorkoutMarker(workOuts);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // Showing the Form
    form.classList.remove('hidden');
    // Making it user friendly by automatically focus on the distance input
    inputDistance.focus();
  }

  _cleanForm() {
    // Clearing the form after submitting
    inputDistance.value = '';
    inputCadence.value = '';
    inputDuration.value = '';
    inputElevation.value = '';
    // Hiding the form after submitting
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => ((form.style.display = 'grid'), 1000));
  }

  _toggleElevationField() {
    // NOTE: the element that we should use to hide the form is not in the input itself, it is in the closest parent which have the class of form__row
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // Function on Validation for Input
    // The .every() basically loops over an array and returns true of false if all of the condition is valid, in this case, if all of the value of an array is finite
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));

    // Function on  validation for positive numbers
    const ifPositive = (...inputs) => inputs.every(inp => inp > 0);
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check data if valid
      if (
        !validInput(distance, duration, cadence) ||
        !ifPositive(distance, duration, cadence)
      )
        return alert('Error, Invalid Input X Please use Positive Numbers only');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check data if valid
      if (
        !validInput(distance, duration, elevation) ||
        !ifPositive(distance, duration)
      )
        return alert('Error, Invalid Input X Please use Positive Numbers only');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render Workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._cleanForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // Display Marker
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        workout.type === 'running'
          ? `🏃‍♂️ ${workout.description}`
          : `🚴${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
        `;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span> 
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
  </li>
  `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    // LOCAL STORAGE API
    // JSON.stringify converts our objects to a string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    // JSON.parse() is opposite of JSON.stringify, it converts the string back to objects
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workOuts => {
      this._renderWorkout(workOuts);
    });
  }
}

const app = new App();
