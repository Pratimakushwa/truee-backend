
const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload');

const {
    createProduct,
    getAdminProducts,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductDetails,
    toggleFeaturedStatus,
} = require('../controllers/productController');

const {
    getProductOptions,
    createProductOption,
    getPublicProductOptions,
    removeProductOption,
} = require('../controllers/productOptionController');

const {
    getSearchSuggestions,
    fullSearch,
} = require('../controllers/searchProductController');

const {
    getSeoProducts,
    getProductSeo,
    updateProductSeo,
    rejectSeoInProductUpdate,
} = require('../controllers/productSeoController');

const {
    protect,
} = require('../middleware/authMiddleware');

const {
    adminOnly,
    superAdminOnly,
} = require('../middleware/roleMiddleware');

// --------------------------------------------------
// 1. SEARCH ROUTES
// --------------------------------------------------

router
    .route('/search-suggestions')
    .get(getSearchSuggestions);

router
    .route('/search')
    .get(fullSearch);

// Public header categories/brands; only returns active menu options.
router
    .route('/options/public')
    .get(getPublicProductOptions);

// --------------------------------------------------
// 2. SUPER ADMIN PRODUCT SEO
// --------------------------------------------------

router
    .route('/superadmin/seo/products')
    .get(
        protect,
        superAdminOnly,
        getSeoProducts
    );

router
    .route('/superadmin/seo/products/:id')
    .get(
        protect,
        superAdminOnly,
        getProductSeo
    )
    .put(
        protect,
        superAdminOnly,
        updateProductSeo
    );

// --------------------------------------------------
// 3. ADMIN CATEGORY AND BRAND OPTIONS
// --------------------------------------------------

router
    .route('/admin/options')
    .get(
        protect,
        adminOnly,
        getProductOptions
    )
    .post(
        protect,
        adminOnly,
        createProductOption
    );

router
    .route('/admin/options/:id')
    .delete(
        protect,
        adminOnly,
        removeProductOption
    );

// --------------------------------------------------
// 4. EXISTING ADMIN PRODUCT ROUTES
// --------------------------------------------------

router
    .route('/admin/product/new')
    .post(
        protect,
        adminOnly,
        upload.any(),
        createProduct
    );

router
    .route('/admin/products')
    .get(
        protect,
        adminOnly,
        getAdminProducts
    );

router
    .route('/admin/product/:id')
    .put(
        protect,
        adminOnly,
        upload.any(),
        rejectSeoInProductUpdate,
        updateProduct
    )
    .delete(
        protect,
        adminOnly,
        deleteProduct
    );

router
    .route('/admin/product/:id/feature')
    .patch(
        protect,
        adminOnly,
        toggleFeaturedStatus
    );

// --------------------------------------------------
// 5. PUBLIC ROUTES
// Dynamic ID route remains last.
// --------------------------------------------------

router
    .route('/')
    .get(getAllProducts);

router
    .route('/:id')
    .get(getProductDetails);

module.exports = router;
