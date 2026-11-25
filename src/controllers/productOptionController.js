const mongoose = require('mongoose');
const ProductOption = require('../models/ProductOptionModel');
const Product = require('../models/ProductModel');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/expressError');

const HEADER_GROUPS = [
    'SPEAKERS',
    'HEADPHONES',
    'EARPHONES',
    'SMARTWATCHES',
    'BEAUTY & WELLNESS',
    'HOME THEATER',
];

const uniqueNames = (values) => {
    const names = new Map();

    for (const value of values) {
        if (typeof value !== 'string' || !value.trim()) continue;
        const name = value.trim();
        const key = name.toLowerCase();
        if (!names.has(key)) names.set(key, name);
    }

    return [...names.values()].sort((a, b) => a.localeCompare(b));
};

const activeOptionsQuery = {
    $or: [
        { isActive: true },
        { isActive: { $exists: false } },
    ],
};

// Admin list: saved active options plus product values that are not archived.
exports.getProductOptions = wrapAsync(async (req, res) => {
    const [savedOptions, productCategories, productBrands, archivedOptions] =
        await Promise.all([
            ProductOption.find(activeOptionsQuery)
                .select('_id type value menuGroup')
                .lean(),
            Product.distinct('category'),
            Product.distinct('brand'),
            ProductOption.find({ isActive: false })
                .select('type normalized')
                .lean(),
        ]);

    const archivedCategories = new Set(
        archivedOptions
            .filter((option) => option.type === 'category')
            .map((option) => option.normalized)
    );
    const archivedBrands = new Set(
        archivedOptions
            .filter((option) => option.type === 'brand')
            .map((option) => option.normalized)
    );

    const categories = uniqueNames([
        ...savedOptions
            .filter((option) => option.type === 'category')
            .map((option) => option.value),
        ...productCategories.filter(
            (value) => !archivedCategories.has(String(value || '').trim().toLowerCase())
        ),
    ]);

    const brands = uniqueNames([
        ...savedOptions
            .filter((option) => option.type === 'brand')
            .map((option) => option.value),
        ...productBrands.filter(
            (value) => !archivedBrands.has(String(value || '').trim().toLowerCase())
        ),
    ]);

    res.status(200).json({
        success: true,
        categories,
        brands,
        categoryDetails: savedOptions
            .filter((option) => option.type === 'category')
            .map((option) => ({
                id: String(option._id),
                value: option.value,
                menuGroup: option.menuGroup || 'SPEAKERS',
            })),
        brandDetails: savedOptions
            .filter((option) => option.type === 'brand')
            .map((option) => ({
                id: String(option._id),
                value: option.value,
            })),
        archivedCategories: archivedOptions
            .filter((option) => option.type === 'category')
            .map((option) => option.normalized),
        archivedBrands: archivedOptions
            .filter((option) => option.type === 'brand')
            .map((option) => option.normalized),
    });
});

// Public list used by the storefront Header. Only active admin-managed values
// are returned; product and admin routes remain protected as before.
exports.getPublicProductOptions = wrapAsync(async (req, res) => {
    const options = await ProductOption.find(activeOptionsQuery)
        .select('type value menuGroup')
        .lean();

    res.status(200).json({
        success: true,
        categories: options
            .filter((option) => option.type === 'category' && option.menuGroup)
            .map((option) => ({
                value: option.value,
                menuGroup: option.menuGroup,
            })),
        brands: uniqueNames(
            options
                .filter((option) => option.type === 'brand')
                .map((option) => option.value)
        ),
    });
});

// Add a category or brand to the admin-managed list.
exports.createProductOption = wrapAsync(async (req, res) => {
    const type = typeof req.body.type === 'string'
        ? req.body.type.trim().toLowerCase()
        : '';
    const value = typeof req.body.value === 'string'
        ? req.body.value.trim()
        : '';
    const menuGroup = typeof req.body.menuGroup === 'string'
        ? req.body.menuGroup.trim().toUpperCase()
        : '';

    if (!['category', 'brand'].includes(type)) {
        throw new ExpressError(400, 'Type must be category or brand');
    }

    if (!value) {
        throw new ExpressError(400, `${type} name is required`);
    }

    if (value.length > 80) {
        throw new ExpressError(400, `${type} name must be 80 characters or fewer`);
    }

    if (type === 'category' && !HEADER_GROUPS.includes(menuGroup)) {
        throw new ExpressError(400, 'Choose a valid header menu for this category');
    }

    const normalized = value.toLowerCase();
    let option = await ProductOption.findOne({ type, normalized });

    if (option) {
        const wasActive = option.isActive !== false;
        option.value = value;
        option.isActive = true;
        option.menuGroup = type === 'category' ? menuGroup : null;
        await option.save();

        return res.status(200).json({
            success: true,
            alreadyExists: wasActive,
            option: {
                id: String(option._id),
                type: option.type,
                value: option.value,
                menuGroup: option.menuGroup,
            },
        });
    }

    try {
        option = await ProductOption.create({
            type,
            value,
            normalized,
            menuGroup: type === 'category' ? menuGroup : null,
        });
    } catch (error) {
        if (error.code !== 11000) throw error;

        option = await ProductOption.findOne({ type, normalized });
        if (!option) throw error;

        option.isActive = true;
        option.menuGroup = type === 'category' ? menuGroup : null;
        await option.save();
    }

    return res.status(201).json({
        success: true,
        alreadyExists: false,
        option: {
            id: String(option._id),
            type: option.type,
            value: option.value,
            menuGroup: option.menuGroup,
        },
    });
});

// Archive an option. Existing Product documents are not changed or deleted.
exports.removeProductOption = wrapAsync(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ExpressError(400, 'Invalid option ID');
    }

    const option = await ProductOption.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true, runValidators: true }
    );

    if (!option) {
        throw new ExpressError(404, 'Category or brand was not found');
    }

    res.status(200).json({
        success: true,
        message: `${option.type} removed from the active lists`,
        optionId: String(option._id),
    });
});
