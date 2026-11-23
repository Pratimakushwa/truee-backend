const mongoose = require('mongoose');
const Product = require('../models/ProductModel');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/expressError');

const SEO_FIELDS = ['seoTitle', 'seoDescription'];

function validateProductId(id) {
    if (
        typeof id !== 'string' ||
        !/^[a-fA-F0-9]{24}$/.test(id) ||
        !mongoose.Types.ObjectId.isValid(id)
    ) {
        throw new ExpressError(400, 'Invalid product ID.');
    }
}

function productSeoResponse(product) {
    return {
        _id: product._id,
        name: product.name,
        brand: product.brand || '',
        category: product.category || '',
        isActive: product.isActive,
        seoTitle: product.seoTitle || '',
        seoDescription: product.seoDescription || '',
        canonicalUrl:
            `https://truee.in/product/${product._id}`,
        updatedAt: product.updatedAt,
    };
}

// Keep SEO changes out of the existing general product-update route.
// This runs after multipart form parsing and before updateProduct.
exports.rejectSeoInProductUpdate = (req, res, next) => {
    const body = req.body;

    if (!body || typeof body !== 'object') {
        return next();
    }

    for (const key of Object.keys(body)) {
        const rootField = key.split('.')[0];

        if (SEO_FIELDS.includes(rootField)) {
            return next(
                new ExpressError(
                    403,
                    'Product SEO must be updated through the Super Admin SEO editor.'
                )
            );
        }

        // Prevent update operators from bypassing the SEO restriction.
        if (key.startsWith('$')) {
            return next(
                new ExpressError(
                    400,
                    'Update operators are not allowed in product form data.'
                )
            );
        }
    }

    next();
};

// Super Admin: paginated product list for the SEO editor.
exports.getSeoProducts = wrapAsync(async (req, res) => {
    const page = Math.max(
        1,
        parseInt(req.query.page, 10) || 1
    );

    const limit = 20;

    const search =
        typeof req.query.search === 'string'
            ? req.query.search.trim()
            : '';

    if (search.length > 200) {
        throw new ExpressError(
            400,
            'Search must be 200 characters or fewer.'
        );
    }

    const filter = {};

    if (search) {
        const escapedSearch = search.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
        );

        filter.$or = [
            {
                name: {
                    $regex: escapedSearch,
                    $options: 'i',
                },
            },
            {
                brand: {
                    $regex: escapedSearch,
                    $options: 'i',
                },
            },
            {
                category: {
                    $regex: escapedSearch,
                    $options: 'i',
                },
            },
        ];
    }

    const [products, total] = await Promise.all([
        Product.find(filter)
            .select(
                'name brand category isActive seoTitle seoDescription updatedAt'
            )
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),

        Product.countDocuments(filter),
    ]);

    res.set('Cache-Control', 'no-store');

    res.status(200).json({
        success: true,
        products: products.map(productSeoResponse),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
});

// Super Admin: load one product's SEO.
exports.getProductSeo = wrapAsync(async (req, res) => {
    validateProductId(req.params.id);

    const product = await Product.findById(req.params.id)
        .select(
            'name brand category isActive seoTitle seoDescription updatedAt'
        )
        .lean();

    if (!product) {
        throw new ExpressError(404, 'Product not found.');
    }

    res.set('Cache-Control', 'no-store');

    res.status(200).json({
        success: true,
        product: productSeoResponse(product),
    });
});

// Super Admin: save SEO fields only.
exports.updateProductSeo = wrapAsync(async (req, res) => {
    validateProductId(req.params.id);

    const body = req.body;

    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body)
    ) {
        throw new ExpressError(400, 'Invalid request body.');
    }

    const keys = Object.keys(body);

    if (
        keys.length === 0 ||
        keys.some((key) => !SEO_FIELDS.includes(key))
    ) {
        throw new ExpressError(
            400,
            'Only seoTitle and seoDescription can be updated here.'
        );
    }

    const changes = {};

    for (const field of keys) {
        if (typeof body[field] !== 'string') {
            throw new ExpressError(
                400,
                `${field} must be text.`
            );
        }

        const value = body[field].trim();
        const maxLength =
            field === 'seoTitle' ? 200 : 500;

        if (value.length > maxLength) {
            throw new ExpressError(
                400,
                `${field} must be ${maxLength} characters or fewer.`
            );
        }

        changes[field] = value;
    }

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
            $set: changes,
        },
        {
            new: true,
            runValidators: true,
        }
    )
        .select(
            'name brand category isActive seoTitle seoDescription updatedAt'
        )
        .lean();

    if (!product) {
        throw new ExpressError(404, 'Product not found.');
    }

    res.set('Cache-Control', 'no-store');

    res.status(200).json({
        success: true,
        message: 'Product SEO updated successfully.',
        product: productSeoResponse(product),
    });
});