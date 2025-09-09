// Paystack API Keys
const PAYSTACK_SECRET_KEY = 'sk_test_6712d1ce8ebdea50b14a16c8fcbe9619391338bb';
const PAYSTACK_PUBLIC_KEY = 'pk_test_7f1f42fd10b5c1f0a6e10c746bd5804eb43224ef';

// App State
let cart = [];
let userAuthorizationCode = null;
let userEmail = 'customer@example.com';
let currentOrderReference = null;
let currentTotalAmount = 0;
let currentPaymentMethod = null;
let testScenario = 'random'; // 'random', 'card_fail', 'funds_fail', 'both_success'

// --- Test Control Functions ---
function setTestScenario(scenario) {
    testScenario = scenario;
    const testStatus = document.getElementById('test-status');
    
    switch(scenario) {
        case 'card_fail':
            testStatus.textContent = 'Current test mode: Card verification will fail';
            testStatus.className = 'status-message error';
            break;
        case 'funds_fail':
            testStatus.textContent = 'Current test mode: Funds verification will fail';
            testStatus.className = 'status-message error';
            break;
        case 'both_success':
            testStatus.textContent = 'Current test mode: Both verifications will succeed';
            testStatus.className = 'status-message success';
            break;
        default:
            testStatus.textContent = 'Current test mode: Random outcomes';
            testStatus.className = 'status-message info';
    }
    
    showNotification(`Test scenario set to: ${scenario}`);
}

function resetTestScenario() {
    testScenario = 'random';
    document.getElementById('test-status').textContent = 'Current test mode: Random outcomes';
    document.getElementById('test-status').className = 'status-message info';
    showNotification('Test scenario reset to random outcomes');
}

// --- Modal Functions ---
function showModal() {
    document.getElementById('modal-total-amount').textContent = currentTotalAmount;
    document.getElementById('paymentModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

// --- Core Application Functions ---
function addToCart(name, price) {
    cart.push({ name, price });
    updateCartDisplay();
    showNotification(`${name} added to cart!`);
}

function updateCartDisplay() {
    const cartItemsElement = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const grandTotalElement = document.getElementById('grand-total');

    if (cart.length === 0) {
        cartItemsElement.innerHTML = '<p>Your cart is empty</p>';
    } else {
        cartItemsElement.innerHTML = cart.map(item => `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>R ${item.price.toFixed(2)}</span>
            </div>
        `).join('');
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const deliveryFee = 35;
    const grandTotal = subtotal + deliveryFee;

    cartTotalElement.textContent = subtotal.toFixed(2);
    grandTotalElement.textContent = grandTotal.toFixed(2);
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.background = '#00b14d';
    notification.style.color = 'white';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// --- Checkout & Payment Functions ---
function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const deliveryFee = 35;
    currentTotalAmount = (subtotal + deliveryFee).toFixed(2);

    // Show the payment options modal
    showModal();
}

function handlePaymentChoice(choice) {
    closeModal();
    currentPaymentMethod = choice;

    if (choice === 'paynow') {
        payNowCheckout(currentTotalAmount);
    } else if (choice === 'pod') {
        payWithPod(currentTotalAmount);
    } else if (choice === 'cancel') {
        showNotification("Order cancelled.");
    }
}

function payNowCheckout(totalAmount) {
    updateOrderStatus('Processing payment...', 'info');
    
    const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: userEmail,
        amount: totalAmount * 100, // Convert to cents
        currency: 'ZAR',
        ref: 'PY_' + Math.floor((Math.random() * 1000000000) + 1),
        onClose: function() {
            updateOrderStatus('Payment was cancelled.', 'error');
        },
        callback: function(response) {
            if (response.status === 'success') {
                updateOrderStatus('Payment successful! Your order is being processed.', 'success');
                document.getElementById('deliver-btn').disabled = false;
                showNotification('Payment processed successfully!');
            } else {
                updateOrderStatus('Payment failed. Please try again.', 'error');
            }
        }
    });
    handler.openIframe();
}

function payWithPod(totalAmount) {
    updateOrderStatus('Starting POD verification process...', 'info');
    document.getElementById('verification-process').style.display = 'block';
    
    // Show verification steps
    const cardIcon = document.getElementById('card-verification-icon');
    const fundsIcon = document.getElementById('funds-verification-icon');
    
    // Reset icons
    cardIcon.textContent = '⏳';
    cardIcon.className = 'verification-icon step-pending';
    fundsIcon.textContent = '⏳';
    fundsIcon.className = 'verification-icon step-pending';
    
    // Step 1: Card verification
    setTimeout(() => {
        cardIcon.textContent = '🔍';
        cardIcon.className = 'verification-icon step-pending';
        updateOrderStatus('Verifying card validity...', 'info');
        
        // Simulate card verification
        setTimeout(() => {
            let cardValid;
            
            // Determine outcome based on test scenario
            if (testScenario === 'card_fail' || testScenario === 'both_success') {
                cardValid = (testScenario === 'both_success');
            } else {
                cardValid = Math.random() > 0.1; // 90% success rate by default
            }
            
            if (cardValid) {
                cardIcon.textContent = '✅';
                cardIcon.className = 'verification-icon step-completed';
                updateOrderStatus('Card verification successful! Checking funds...', 'info');
                
                // Step 2: Funds verification
                fundsIcon.textContent = '🔍';
                fundsIcon.className = 'verification-icon step-pending';
                
                setTimeout(() => {
                    let fundsAvailable;
                    
                    // Determine outcome based on test scenario
                    if (testScenario === 'funds_fail' || testScenario === 'both_success') {
                        fundsAvailable = (testScenario === 'both_success');
                    } else {
                        fundsAvailable = Math.random() > 0.2; // 80% success rate by default
                    }
                    
                    if (fundsAvailable) {
                        fundsIcon.textContent = '✅';
                        fundsIcon.className = 'verification-icon step-completed';
                        updateOrderStatus('Funds verification successful! POD order created.', 'success');
                        document.getElementById('deliver-btn').disabled = false;
                        showNotification('POD order created successfully!');
                        
                        // Store the authorization for later use
                        userAuthorizationCode = 'auth_' + Math.floor((Math.random() * 1000000000) + 1);
                        currentOrderReference = 'POD_' + Math.floor((Math.random() * 1000000000) + 1);
                    } else {
                        fundsIcon.textContent = '❌';
                        fundsIcon.className = 'verification-icon step-failed';
                        updateOrderStatus('Insufficient funds for POD. Please use another payment method.', 'error');
                        showNotification('Insufficient funds for POD order.');
                    }
                }, 2000);
            } else {
                cardIcon.textContent = '❌';
                cardIcon.className = 'verification-icon step-failed';
                updateOrderStatus('Card verification failed. Please use a valid card.', 'error');
                showNotification('Card verification failed.');
            }
        }, 2000);
    }, 1000);
}

function updateOrderStatus(message, type) {
    const statusElement = document.getElementById('order-status');
    statusElement.innerHTML = `<p>${message}</p>`;
    statusElement.className = 'status-message ' + type;
}

function simulateDelivery() {
    if (currentPaymentMethod === 'pod') {
        updateOrderStatus('Processing delivery and capturing payment...', 'info');
        
        // Simulate API call to capture payment
        setTimeout(() => {
            // 95% success rate for payment capture
            const success = Math.random() > 0.05;
            
            if (success) {
                updateOrderStatus('Delivery completed! Payment captured successfully.', 'success');
                document.getElementById('deliver-btn').disabled = true;
                showNotification('Delivery completed and payment processed!');
                
                // Clear cart after successful delivery
                cart = [];
                updateCartDisplay();
            } else {
                updateOrderStatus('Payment capture failed. Please try again.', 'error');
            }
        }, 2000);
    } else {
        // For regular payments, just confirm delivery
        updateOrderStatus('Delivery completed! Thank you for your order.', 'success');
        document.getElementById('deliver-btn').disabled = true;
        showNotification('Delivery completed!');
        
        // Clear cart after successful delivery
        cart = [];
        updateCartDisplay();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    updateCartDisplay();
});