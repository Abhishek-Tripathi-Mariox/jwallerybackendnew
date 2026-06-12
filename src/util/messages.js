module.exports = (lang = "en") => {
  const user_already_found = {
    en: "User already found with given username, Try again after new username!",
  };

  const success = {
    en: "success",
  };

  const logout = {
    en: "logout successfully",
  };

  const invalid_token = {
    en: "invalid token",
  };

  const users_list = {
    en: "users list",
  };

  const interest_exists = {
    en: "you have added this interest before",
  };

  const user_not_found = {
    en: "user detail not found with given id",
  };

  const forbidden = {
    en: "forbidden",
  };

  const otp_sent = {
    en: "otp send to your register mobile number",
  };

  const otp_verified = {
    en: "login successfully",
  };

  const incorrect_otp = {
    en: "incorrect otp, try again!",
  };

  const status_changed = {
    en: "status changed successfully",
  };

  // Category & Product messages
  const category_not_found = { en: "Category not found" };
  const product_not_found = { en: "Product not found" };

  // Wishlist messages
  const added_to_wishlist = { en: "Added to wishlist" };
  const removed_from_wishlist = { en: "Removed from wishlist" };
  const already_in_wishlist = { en: "Product already in wishlist" };
  const wishlist_cleared = { en: "Wishlist cleared" };

  // Cart messages
  const added_to_cart = { en: "Added to cart" };
  const cart_updated = { en: "Cart updated" };
  const removed_from_cart = { en: "Removed from cart" };
  const cart_cleared = { en: "Cart cleared" };
  const cart_empty = { en: "Cart is empty" };

  // Coupon messages
  const coupon_applied = { en: "Coupon applied successfully" };
  const coupon_removed = { en: "Coupon removed" };
  const invalid_coupon = { en: "Invalid coupon code" };

  // Order messages
  const order_placed = { en: "Order placed successfully" };
  const order_created = { en: "Order created, complete payment" };
  const order_not_found = { en: "Order not found" };
  const order_cancelled = { en: "Order cancelled successfully" };
  const items_added_to_cart = { en: "Items added to cart" };
  const invalid_address = { en: "Invalid delivery address" };
  const payment_init_failed = { en: "Payment initialization failed" };
  const payment_verified = { en: "Payment verified successfully" };
  const payment_verification_failed = { en: "Payment verification failed" };

  // Review messages
  const review_submitted = { en: "Review submitted successfully" };
  const review_updated = { en: "Review updated successfully" };
  const review_deleted = { en: "Review deleted successfully" };
  const review_not_found = { en: "Review not found" };
  const already_reviewed = { en: "You have already reviewed this product" };
  const cannot_review_undelivered = {
    en: "You can only review delivered products",
  };
  const invalid_rating = { en: "Rating must be between 1 and 5" };

  // Admin auth messages
  const login_success = { en: "Login successful" };
  const password_changed = { en: "Password changed successfully" };
  const password_reset = { en: "Password reset successfully" };

  // General messages
  const unauthorized = { en: "Unauthorized access" };
  const something_went_wrong = { en: "Something went wrong, please try again" };
  const ac_deactivated = { en: "Your account has been deactivated" };

  return {
    user_already_found: user_already_found[lang],
    success: success[lang],
    logout: logout[lang],
    invalid_token: invalid_token[lang],
    users_list: users_list[lang],
    user_not_found: user_not_found[lang],
    forbidden: forbidden[lang],
    otp_sent: otp_sent[lang],
    otp_verified: otp_verified[lang],
    incorrect_otp: incorrect_otp[lang],
    status_changed: status_changed[lang],
    interest_exists: interest_exists[lang],

    // Category & Product
    category_not_found: category_not_found[lang],
    product_not_found: product_not_found[lang],

    // Wishlist
    added_to_wishlist: added_to_wishlist[lang],
    removed_from_wishlist: removed_from_wishlist[lang],
    already_in_wishlist: already_in_wishlist[lang],
    wishlist_cleared: wishlist_cleared[lang],

    // Cart
    added_to_cart: added_to_cart[lang],
    cart_updated: cart_updated[lang],
    removed_from_cart: removed_from_cart[lang],
    cart_cleared: cart_cleared[lang],
    cart_empty: cart_empty[lang],

    // Coupon
    coupon_applied: coupon_applied[lang],
    coupon_removed: coupon_removed[lang],
    invalid_coupon: invalid_coupon[lang],

    // Order
    order_placed: order_placed[lang],
    order_created: order_created[lang],
    order_not_found: order_not_found[lang],
    order_cancelled: order_cancelled[lang],
    items_added_to_cart: items_added_to_cart[lang],
    invalid_address: invalid_address[lang],
    payment_init_failed: payment_init_failed[lang],
    payment_verified: payment_verified[lang],
    payment_verification_failed: payment_verification_failed[lang],

    // Review
    review_submitted: review_submitted[lang],
    review_updated: review_updated[lang],
    review_deleted: review_deleted[lang],
    review_not_found: review_not_found[lang],
    already_reviewed: already_reviewed[lang],
    cannot_review_undelivered: cannot_review_undelivered[lang],
    invalid_rating: invalid_rating[lang],

    // Admin auth
    login_success: login_success[lang],
    password_changed: password_changed[lang],
    password_reset: password_reset[lang],

    // General
    unauthorized: unauthorized[lang],
    something_went_wrong: something_went_wrong[lang],
    ac_deactivated: ac_deactivated[lang],
  };
};
