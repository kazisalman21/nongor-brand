// ==============================================
// CHECKOUT — Order placement, coupons, tracking
// ==============================================

window.initCheckout = async function () {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const legacyId = params.get('id');

    let checkoutItems = [];

    if (mode === 'direct') {
        try {
            checkoutItems = JSON.parse(localStorage.getItem('nongor_direct_buy')) || [];
        } catch (e) {
            console.error('Error reading direct buy data', e);
        }
    } else if (legacyId) {
        const id = parseInt(legacyId);
        if (allProducts.length === 0) {
            try {
                const response = await fetch(`${API_URL}?action=getProducts`);
                const data = await response.json();
                if (data.result === 'success' && data.data) {
                    allProducts = data.data;
                } else if (data.success && data.products) {
                    allProducts = data.products;
                } else {
                    allProducts = fallbackProducts;
                }
            } catch (err) {
                allProducts = fallbackProducts;
            }
        }

        const qty = parseInt(params.get('qty')) || 1;
        const size = params.get('size') || 'M';
        const product = allProducts.find(p => p.id == id);

        if (product) {
            checkoutItems.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                size: size,
                quantity: qty,
                sizeType: 'standard'
            });
        }
    } else {
        checkoutItems = JSON.parse(localStorage.getItem('nongor_cart')) || [];
    }

    if (checkoutItems.length === 0) {
        document.getElementById('checkout-items-container').innerHTML = '<p class="text-center text-red-500">No items in checkout.</p>';
        return;
    }

    const container = document.getElementById('checkout-items-container');
    container.innerHTML = checkoutItems.map(item => `
    <div class="flex gap-4 items-start bg-gray-50/50 p-2 rounded-lg">
        <img src="${item.image && item.image.startsWith('http') ? item.image : './assets/' + (item.image || 'logo.jpeg').replace(/^\.?\/?assets\//, '')}" class="w-16 h-20 object-cover rounded-md bg-white border border-gray-100" onerror="this.src='./assets/logo.jpeg'">
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-gray-900 text-sm line-clamp-1">${item.name}</h4>
                        ${item.sizeType === 'custom'
            ? `<p class="text-xs text-gray-500 mt-1">Custom: <span class="font-bold text-brand-deep">${item.unit}</span></p>
                               <p class="text-[10px] text-gray-400 leading-tight mt-0.5">
                                 ${Object.entries(item.measurements || {}).map(([k, v]) => `${k}:${v}`).join(', ')}
                               </p>`
            : `<p class="text-xs text-gray-500 mt-1">Size: <span class="font-bold text-brand-deep">${item.size}</span></p>`
        }
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-brand-terracotta text-sm">৳${((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toLocaleString()}</p>
                        <p class="text-xs text-gray-500">Qty: ${item.quantity}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    const total = checkoutItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
    document.getElementById('checkout-subtotal').textContent = `৳${total.toLocaleString()} `;

    window.checkoutPayload = checkoutItems;
    window.checkoutTotal = total;
    window.shippingFee = 70;

    updateTotalWithShipping();

    const phoneInput = document.getElementById('cust-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function () { validatePhoneRealtime(this); });
        phoneInput.addEventListener('blur', function () { validatePhoneRealtime(this); });
    }

    const paymentInputs = document.querySelectorAll('input[name="payment_method"]');
    paymentInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const method = e.target.value;
            const container = document.getElementById('payment-options');
            const existing = document.getElementById('manual-payment-info');
            if (existing) existing.remove();

            if (method === 'Bkash') {
                const displayedTotal = document.getElementById('checkout-total')?.textContent || '৳0';

                const div = document.createElement('div');
                div.id = 'manual-payment-info';
                div.className = 'mt-6 p-6 bg-pink-50/50 border border-pink-100 rounded-xl text-sm animate-fade-in ring-1 ring-pink-200';
                div.innerHTML = `
    <div class="flex items-start gap-4 mb-4">
                        <div class="bg-pink-100 p-2 rounded-full">
                            <svg class="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                            <p class="font-bold text-gray-800 mb-1">bKash Payment Instructions</p>
                            <p class="text-gray-600 leading-relaxed">
                                Please <strong>Send Money</strong> <span class="font-bold text-brand-deep bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">${displayedTotal}</span> to:
                                <br><span class="font-mono font-bold text-lg select-all text-brand-deep mt-1 inline-block">01872647323</span> <span class="text-xs text-gray-400 font-medium ml-1">(Personal)</span>
                            </p>
                        </div>
                    </div >

    <div class="space-y-4">
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your bKash Number</label>
            <input type="tel" id="manual-sender" placeholder="e.g. 017XXXXXXXX" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-white font-mono text-gray-700 placeholder-gray-300 shadow-sm">
        </div>
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transaction ID (TrxID)</label>
            <input type="text" id="manual-trx" placeholder="e.g. 8X3D7..." class="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all bg-white font-mono uppercase text-gray-700 placeholder-gray-300 shadow-sm">
        </div>
    </div>
`;
                container.parentNode.insertBefore(div, container.nextSibling);
            }
        });
    });
};

window.updateShipping = function (fee) {
    window.shippingFee = fee;
    updateTotalWithShipping();
};

function updateTotalWithShipping() {
    const deliveryEl = document.getElementById('checkout-delivery');
    const totalEl = document.getElementById('checkout-total');
    const couponMsgEl = document.getElementById('coupon-message');

    if (deliveryEl) deliveryEl.textContent = `৳${window.shippingFee} `;

    let total = (window.checkoutTotal || 0) + (window.shippingFee || 0);

    if (window.discountAmount) {
        total -= window.discountAmount;
        if (couponMsgEl) {
            couponMsgEl.textContent = `Coupon applied! You saved ৳${window.discountAmount}`;
            couponMsgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-green-600";
        }
    }

    if (totalEl) totalEl.textContent = `৳${Math.max(0, total).toLocaleString()} `;

    const manualInfo = document.getElementById('manual-payment-info');
    if (manualInfo) {
        const inputs = document.querySelectorAll('input[name="payment_method"]');
        inputs.forEach(i => {
            if (i.checked && i.value === 'Bkash') i.dispatchEvent(new Event('change'));
        });
    }
}
window.updateTotalWithShipping = updateTotalWithShipping;

// --- Coupon ---
window.checkCoupon = async function () {
    const codeInput = document.getElementById('coupon-code');
    const msgEl = document.getElementById('coupon-message');
    const code = codeInput.value.trim();

    if (!code) {
        msgEl.textContent = "Please enter a code";
        msgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-red-500";
        return;
    }

    try {
        const subtotal = window.checkoutTotal || 0;
        const res = await fetch(`${API_URL}?action=validateCoupon&code=${encodeURIComponent(code)}&amount=${subtotal}`);
        const data = await res.json();

        if (data.result === 'success') {
            window.discountAmount = data.discount;
            window.appliedCouponCode = data.coupon.code;

            msgEl.textContent = `Success! ${data.message}`;
            msgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-green-600";

            updateTotalWithShipping();
        } else {
            window.discountAmount = 0;
            window.appliedCouponCode = null;
            msgEl.textContent = data.message;
            msgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-red-500";
            updateTotalWithShipping();
        }
    } catch (e) {
        console.error(e);
        msgEl.textContent = "Error validation coupon";
        msgEl.className = "text-xs mt-1 min-h-[1.25rem] font-medium text-red-500";
    }
};

// --- Order Submission (Page) ---
window.confirmOrderFromPage = async function () {
    const confirmBtn = document.getElementById('btn-confirm-order');
    const originalText = confirmBtn.innerHTML;

    const name = document.getElementById('cust-name').value.trim();
    let phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const email = document.getElementById('cust-email')?.value.trim();

    if (!name || !phone || !address) {
        showToast("সব তথ্য দিন", 'error');
        return;
    }

    if (!window.checkoutPayload || window.checkoutPayload.length === 0) {
        showToast("কার্ট খালি", 'error');
        return;
    }

    if (!isValidBangladeshiPhone(phone)) {
        showToast("Invalid Phone Number (Must be 11 digits starting with 01)", 'error');
        return;
    }

    let fullPhone = phone.replace(/\D/g, '');
    if (fullPhone.startsWith('8801')) fullPhone = fullPhone.substring(2);

    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    const shippingZone = document.querySelector('input[name="shipping_zone"]:checked')?.value || 'inside_dhaka';
    let senderNumber = '', trxId = '';

    if (paymentMethod === 'Bkash') {
        senderNumber = document.getElementById('manual-sender')?.value.trim();
        trxId = document.getElementById('manual-trx')?.value.trim();
        if (!senderNumber || !trxId) {
            showToast("বিকাশ তথ্য দিন", 'error');
            return;
        }
    }

    const itemsDescription = window.checkoutPayload.map(i => {
        if (i.sizeType === 'custom') {
            const m = Object.entries(i.measurements || {}).map(([k, v]) => `${k}:${v}`).join(', ');
            return `${i.name} [Custom ${i.unit}: ${m}] x${i.quantity}`;
        }
        return `${i.name} (${i.size}) x${i.quantity}`;
    }).join(', ');

    const orderData = {
        productId: (window.checkoutPayload && window.checkoutPayload.length > 0) ? window.checkoutPayload[0].id : null,
        customerName: name,
        customerEmail: email,
        customerPhone: fullPhone,
        address: address,
        productName: itemsDescription,
        items: window.checkoutPayload,
        price: '0',
        size: 'Mixed',
        quantity: window.checkoutPayload.reduce((s, i) => s + i.quantity, 0),
        deliveryDate: new Date(Date.now() + 259200000).toLocaleDateString('en-GB'),
        paymentMethod: paymentMethod,
        senderNumber: senderNumber,
        trxId: trxId,
        couponCode: window.appliedCouponCode,
        shippingZone: shippingZone,
        shippingFee: window.shippingFee,
        status: 'Pending'
    };

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const result = await res.json();

        if (result.result === 'success') {
            const serverOrderId = result.data.order_id;
            document.getElementById('success-order-id').textContent = serverOrderId;
            document.getElementById('order-success').classList.replace('hidden', 'flex');
            document.getElementById('checkout-form').classList.add('hidden');
            document.body.style.overflow = 'hidden';

            localStorage.removeItem('nongor_cart');
        } else {
            throw new Error(result.error || result.message || "Failed");
        }
    } catch (e) {
        alert("Error: " + e.message);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
};

window.hideCheckout = function () {
    document.getElementById('checkout-form').classList.add('hidden');
    document.getElementById('modal-actions').classList.remove('hidden');
};

// --- Order Submission (Modal/Quick) ---
window.confirmOrder = async function () {

    const name = document.getElementById('cust-name').value.trim();
    let phoneInput = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const confirmBtn = document.getElementById('btn-confirm-order');

    if (!name || !phoneInput || !address) {
        showToast("অনুগ্রহ করে সব তথ্য দিন (Please fill all details)", 'error');
        return;
    }

    phoneInput = phoneInput.replace(/\D/g, '');
    const bdPhoneRegex = /^01[3-9]\d{8}$/;

    if (!bdPhoneRegex.test(phoneInput)) {
        showToast("মোবাইল নম্বরটি সঠিক নয় (Invalid Phone Number)", 'error');
        return;
    }

    const phone = '+88' + phoneInput;

    const date = new Date();
    date.setDate(date.getDate() + 3);
    const deliveryDate = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || "COD";
    let senderNumber = '';
    let trxId = '';

    if (paymentMethod === 'Bkash') {
        senderNumber = document.getElementById('manual-sender')?.value.trim();
        trxId = document.getElementById('manual-trx')?.value.trim();

        if (!senderNumber || !trxId) {
            alert("Please enter your Sender Number and Transaction ID to proceed.");
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = "অর্ডার নিশ্চিত করুন";
            return;
        }
    }

    let measurements = null;
    let sizeLabel = selectedSize;
    let unit = 'inch';
    let notes = '';
    let sizeType = 'standard';

    if (window.getAndValidateMeasurements) {
        if (typeof currentSizeType !== 'undefined' && currentSizeType === 'custom') {
            const val = getAndValidateMeasurements();
            if (!val.valid) {
                confirmBtn.innerHTML = "অর্ডার নিশ্চিত করুন";
                confirmBtn.disabled = false;
                return;
            }
            sizeType = 'custom';
            measurements = val.measurements;
            unit = val.unit;
            notes = val.notes;
            const mStr = Object.entries(measurements).map(([k, v]) => `${k}:${v}`).join(', ');
            sizeLabel = `Custom (${unit}): ${mStr}`;
        }
    }

    const items = [{
        id: currentProductId,
        quantity: currentQuantity,
        size: sizeLabel,
        sizeType: sizeType,
        unit: unit,
        measurements: measurements,
        notes: notes
    }];

    const orderData = {
        productId: currentProductId || ((window.checkoutPayload && window.checkoutPayload.length > 0) ? window.checkoutPayload[0].id : null),
        customerName: name,
        customerPhone: phone,
        address: address,
        productName: document.getElementById('modal-title').textContent + (sizeType === 'custom' ? ` - ${sizeLabel}` : ''),
        items: items,
        size: sizeLabel,
        quantity: currentQuantity,
        deliveryDate: deliveryDate,
        paymentMethod: paymentMethod,
        senderNumber: senderNumber,
        trxId: trxId,
        shippingFee: window.shippingFee || 70,
        status: 'Pending'
    };

    const originalHTML = confirmBtn.innerHTML;
    confirmBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        অর্ডার প্রসেস হচ্ছে...
    `;
    confirmBtn.disabled = true;

    try {

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.result === "success") {
            const serverOrderId = result.data.order_id;

            const checkoutForm = document.getElementById('checkout-form');
            const modalActions = document.getElementById('modal-actions');
            const orderSuccess = document.getElementById('order-success');

            if (checkoutForm) checkoutForm.classList.add('hidden');
            if (modalActions) modalActions.classList.add('hidden');
            if (orderSuccess) {
                orderSuccess.classList.remove('hidden');
                document.body.style.overflow = 'hidden';

                const orderIdEl = document.getElementById('success-order-id');
                const deliveryDateEl = document.getElementById('success-delivery-date');

                if (orderIdEl) orderIdEl.textContent = serverOrderId;
                if (deliveryDateEl) deliveryDateEl.textContent = deliveryDate;
            }

            showToast("✅ অর্ডার সফল হয়েছে!");
        } else {
            throw new Error(result.message || "Unknown Error");
        }

    } catch (e) {
        console.error("❌ Order failed:", e);
        showToast("অর্ডার ব্যর্থ হয়েছে: " + e.message, 'error');
        confirmBtn.innerHTML = originalHTML;
        confirmBtn.disabled = false;
    }
};

// --- Tracking ---
window.openTrackingModal = function () {
    document.getElementById('tracking-modal').classList.remove('hidden');
};

window.closeTrackingModal = function () {
    document.getElementById('tracking-modal').classList.add('hidden');
    document.getElementById('track-result').classList.add('hidden');
    document.getElementById('track-id-input').value = '';
};

window.trackOrder = async function () {
    const idInput = document.getElementById('track-id-input').value.trim();
    if (!idInput) {
        showToast('অর্ডারের আইডি দিন (Enter Order ID)', 'error');
        return;
    }

    const trackBtn = document.querySelector('#btn-track-submit');

    try {
        const originalText = trackBtn.innerHTML;
        trackBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white inline-block mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Searching...</span>
        `;
        trackBtn.disabled = true;

        let queryParam = 'orderId=' + encodeURIComponent(idInput);
        if (idInput.length > 20) {
            queryParam = 'tracking_token=' + encodeURIComponent(idInput);
        }

        const response = await fetch(`${API_URL}?${queryParam}&_t=${Date.now()}`);
        const result = await response.json();

        if (result.result === "success") {
            const order = result.data;
            document.getElementById('track-result').classList.remove('hidden');
            document.getElementById('track-id-display').textContent = order.order_id;

            const amountEl = document.getElementById('track-amount');
            if (amountEl) amountEl.textContent = `৳${parseFloat(order.total_price || 0).toLocaleString('bn-BD')} `;

            const statusContainer = document.getElementById('track-status-container');
            const deliveryStatus = order.delivery_status || order.status || 'Pending';
            const paymentStatus = order.payment_status || 'Unpaid';
            const statusColor = getStatusColor(deliveryStatus);

            statusContainer.innerHTML = '';
            const statusDiv = document.createElement('div');
            statusDiv.className = 'flex flex-col gap-1';

            const statusSpan = document.createElement('span');
            statusSpan.className = `text-2xl font-bold ${statusColor} block`;
            statusSpan.textContent = deliveryStatus;

            const itemsSpan = document.createElement('span');
            itemsSpan.className = 'text-gray-400 text-xs text-left block mt-1';
            itemsSpan.innerHTML = '<span class="font-bold">Items:</span> ';
            const itemsText = document.createTextNode(order.product_name || '');
            itemsSpan.appendChild(itemsText);

            statusDiv.appendChild(statusSpan);
            statusDiv.appendChild(itemsSpan);
            statusContainer.appendChild(statusDiv);

            const paymentBox = document.getElementById('track-payment-status');
            if (paymentBox) {
                const paymentColor = getPaymentColor(paymentStatus);
                paymentBox.innerHTML = `<span class="${paymentColor}">${paymentStatus}</span>`;
            }

            document.getElementById('track-delivery-date').textContent = order.delivery_date || 'Processing...';

        } else {
            showToast("Order not found! (অর্ডারটি পাওয়া যায়নি)", 'error');
            document.getElementById('track-result').classList.add('hidden');
        }

    } catch (e) {
        console.error("Tracking Error:", e);
        showToast("Tracking Failed: " + e.message, 'error');
    } finally {
        trackBtn.innerHTML = `<span>TRACK NOW</span>`;
        trackBtn.disabled = false;
    }
};

// --- Copy Order ID to Clipboard ---
window.copyOrderId = function () {
    const orderIdEl = document.getElementById('success-order-id');
    if (!orderIdEl) return;

    const orderId = orderIdEl.textContent.trim();
    navigator.clipboard.writeText(orderId).then(() => {
        // Show check icon, hide copy icon (supports both index.html and checkout.html)
        const copyIcon = document.getElementById('copy-icon') || document.getElementById('copy-icon-checkout');
        const checkIcon = document.getElementById('check-icon') || document.getElementById('check-icon-checkout');

        if (copyIcon) copyIcon.classList.add('hidden');
        if (checkIcon) checkIcon.classList.remove('hidden');

        showToast('Order ID copied! 📋');

        setTimeout(() => {
            if (copyIcon) copyIcon.classList.remove('hidden');
            if (checkIcon) checkIcon.classList.add('hidden');
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = orderId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Order ID copied! 📋');
    });
};

