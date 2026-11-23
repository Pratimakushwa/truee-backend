

const Product = require('../models/ProductModel');
const Review = require('../models/reviewModel');
const Order = require('../models/orderModel'); 
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/expressError');

// ==========================================
// 🧑‍💻 USER CONTROLS
// ==========================================

// @desc    Create Review
exports.createReview = wrapAsync(async (req, res, next) => {
  const { rating, comment, productName } = req.body;
  const productId = req.params.productId;

  // ⚡ TESTING HACK: Testing ke liye niche wale code ko comment/uncomment karo
  // Jab tumhe test karna ho, to ye 'if' condition hata dena ya comment kar dena.
  // Production mein ye check zaroori hai.
  
  /* const hasDeliveredOrder = await Order.findOne({
    user: req.user._id,
    'orderItems.product': productId,
    orderStatus: 'Delivered' 
  });

  if (!hasDeliveredOrder && productId.length === 24) {
    return next(new ExpressError(403, 'You can only review products that have been delivered to you.'));
  }
  */

  // Check if already reviewed
  const alreadyReviewed = await Review.findOne({ user: req.user._id, product: productId });
  if (alreadyReviewed) {
    return next(new ExpressError(400, 'You have already reviewed this product.'));
  }

  // Create review (Status default 'Pending' rahega)
  const review = await Review.create({
    user: req.user._id,
    product: productId,
    productName: productName || 'Product',
    rating: Number(rating),
    comment,
  });

  // Link to Product
  if (productId.length === 24) {
    const product = await Product.findById(productId);
    if (product) {
      // ⚡ SUPER FIX: Agar product mein reviews array pehle se nahi hai, toh use empty array banao
      if (!product.reviews) {
        product.reviews = []; 
      }
      
      product.reviews.push(review._id);
      await product.save({ validateBeforeSave: false });
    }
  }

  res.status(201).json({
    success: true,
    message: 'Thank you! Your review has been submitted and is pending admin approval.',
    review,
  });
});

// @desc    Get Approved Reviews by Product ID
exports.getReviewsByProduct = wrapAsync(async (req, res, next) => {
  const reviews = await Review.find({ product: req.params.productId, status: 'Approved' })
                              .populate('user', 'name');
  res.status(200).json({ success: true, reviews });
});

// @desc    Get Featured Testimonials for Homepage Slider
exports.getFeaturedTestimonials = wrapAsync(async (req, res, next) => {
  // Sirf Approved aur Featured reviews
  const testimonials = await Review.find({ status: 'Approved', isFeatured: true })
                                     .populate('user', 'name')
                                     .sort({ createdAt: -1 });
  res.status(200).json({ success: true, testimonials });
});

// @desc    Get Approved Testimonials for Homepage Slider
exports.getApprovedTestimonials = wrapAsync(async (req, res, next) => {
  const testimonials = await Review.find({ status: 'Approved' })
                                   .populate('user', 'name')
                                   .sort({ createdAt: -1 });
  res.status(200).json({ success: true, testimonials });
});

// @desc    Get ALL Reviews (Pending, Approved, Rejected)
exports.getAllReviewsAdmin = wrapAsync(async (req, res, next) => {
  const reviews = await Review.find().populate('user', 'name email').sort({ createdAt: -1 });
  res.status(200).json({ success: true, reviews });
});

exports.getMyReviews = wrapAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user._id });
  res.status(200).json({ success: true, reviews });
});

// @desc    Update Review Status (Approve / Reject)
exports.updateReviewStatus = wrapAsync(async (req, res, next) => {
  const { status } = req.body; 
  const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });

  if (!review) return next(new ExpressError(404, 'Review not found'));

  res.status(200).json({ success: true, message: `Review status updated to ${status}`, review });
});

// @desc    Toggle Feature Status
exports.toggleFeatureStatus = wrapAsync(async (req, res, next) => {
  const { isFeatured } = req.body;
  const review = await Review.findById(req.params.id);
  
  if (!review) return next(new ExpressError(404, 'Review not found'));
  if (isFeatured === true && review.status !== 'Approved') {
    return next(new ExpressError(400, 'Only approved reviews can be featured.'));
  }

  review.isFeatured = isFeatured;
  await review.save();

  res.status(200).json({ success: true, message: 'Feature status updated', review });
});

// ==========================================
// USER EDIT / DELETE
// ==========================================
exports.updateReview = wrapAsync(async (req, res, next) => {
  const { rating, comment } = req.body;
  let review = await Review.findById(req.params.id);
  
  if (!review) return next(new ExpressError(404, 'Review not found'));
  if (review.user.toString() !== req.user._id.toString()) return next(new ExpressError(403, 'Not authorized'));

  review.rating = rating || review.rating;
  review.comment = comment || review.comment;
  review.status = 'Pending'; // Edit hote hi wapas approval ke liye jayega
  await review.save();

  res.status(200).json({ success: true, message: 'Review updated and sent for approval', review });
});

exports.deleteReview = wrapAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new ExpressError(404, 'Review not found'));
  if (review.user.toString() !== req.user._id.toString()) return next(new ExpressError(403, 'Not authorized'));

  const productId = review.product;
  await review.deleteOne();
  await Product.findByIdAndUpdate(productId, { $pull: { reviews: req.params.id } });

  res.status(200).json({ success: true, message: 'Review deleted successfully' });
});