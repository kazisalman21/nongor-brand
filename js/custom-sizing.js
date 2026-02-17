// ==============================================
// CUSTOM SIZING — Logic for custom measurements
// ==============================================

window.toggleSizeType = function (type) {
    currentSizeType = type;
    updateSizeTypeUI();
};

window.toggleUnit = function (unit) {
    currentMeasurementUnit = unit;
    const btnInch = document.getElementById('btn-unit-inch');
    const btnCm = document.getElementById('btn-unit-cm');

    if (btnInch) btnInch.className = `px-2 py-0.5 text-xs font-bold rounded-l ${unit === 'inch' ? 'bg-brand-terracotta text-white' : 'text-gray-500 bg-white'}`;
    if (btnCm) btnCm.className = `px-2 py-0.5 text-xs font-bold rounded-r ${unit === 'cm' ? 'bg-brand-terracotta text-white' : 'text-gray-500 bg-white'}`;
};

window.updateSizeTypeUI = function () {
    const stdBtn = document.getElementById('btn-size-standard');
    const cstBtn = document.getElementById('btn-size-custom');
    const stdSelector = document.getElementById('size-selector');
    const cstForm = document.getElementById('custom-size-form');

    if (!stdBtn || !cstBtn || !stdSelector || !cstForm) return;

    if (currentSizeType === 'standard') {
        stdBtn.className = "px-4 py-1.5 rounded-md text-sm font-bold transition-all bg-white shadow-sm text-brand-deep ring-1 ring-gray-200";
        cstBtn.className = "px-4 py-1.5 rounded-md text-sm font-bold transition-all text-gray-500 hover:text-brand-deep";
        stdSelector.classList.remove('hidden');
        cstForm.classList.add('hidden');
    } else {
        stdBtn.className = "px-4 py-1.5 rounded-md text-sm font-bold transition-all text-gray-500 hover:text-brand-deep";
        cstBtn.className = "px-4 py-1.5 rounded-md text-sm font-bold transition-all bg-white shadow-sm text-brand-deep ring-1 ring-gray-200";
        stdSelector.classList.add('hidden');
        cstForm.classList.remove('hidden');
    }
};

window.getAndValidateMeasurements = function () {
    if (currentSizeType === 'standard') return { valid: true };

    const inputs = document.querySelectorAll('#custom-size-form input[data-measure]');
    const measurements = {};
    let isValid = true;

    inputs.forEach(i => i.classList.remove('border-red-500'));

    inputs.forEach(input => {
        const val = parseFloat(input.value);
        const name = input.getAttribute('data-measure');

        if (isNaN(val) || val <= 0) {
            isValid = false;
            input.classList.add('border-red-500');
        } else {
            if (currentMeasurementUnit === 'inch' && (val < 5 || val > 100)) {
                isValid = false;
                input.classList.add('border-red-500');
            } else if (currentMeasurementUnit === 'cm' && (val < 10 || val > 250)) {
                isValid = false;
                input.classList.add('border-red-500');
            }
            measurements[name] = val;
        }
    });

    if (!isValid) {
        showToast('Please check highlighted measurements', 'error');
        return { valid: false };
    }

    const noteEl = document.getElementById('custom-note');
    const note = noteEl ? noteEl.value.trim() : '';
    return {
        valid: true,
        measurements,
        unit: currentMeasurementUnit,
        notes: note
    };
};

// Make accessible
window.getAndValidateMeasurements = getAndValidateMeasurements;
