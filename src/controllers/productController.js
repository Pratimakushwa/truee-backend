



const Product = require('../models/ProductModel');
const Review = require('../models/reviewModel');
const wrapAsync = require('../utils/wrapAsync');
const ExpressError = require('../utils/expressError');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');
const r2 = require('../config/cloudConfig');
const sharp = require('sharp');

// -------------------------------------------------------------------
// APPROVED REVIEWS SE AVERAGE RATING AUR REVIEW COUNT
// -------------------------------------------------------------------
const addApprovedRatings = async (products) => {
    if (!products.length) return products;

    const productIds = products.map((product) => product._id);
    const productIdStrings = productIds.map((id) => String(id));

    // Review.product Mixed hai, isliye ObjectId aur String dono match honge.
    const statistics = await Review.aggregate([
        {
            $match: {
                status: 'Approved',
                product: {
                    $in: [...productIds, ...productIdStrings],
                },
                rating: {
                    $type: 'number',
                    $gte: 1,
                    $lte: 5,
                },
            },
        },
        {
            $group: {
                _id: {
                    $convert: {
                        input: '$product',
                        to: 'string',
                        onError: null,
                        onNull: null,
                    },
                },
                average: { $avg: '$rating' },
                count: { $sum: 1 },
            },
        },
    ]);

    const ratingsByProduct = new Map(
        statistics.map((item) => [
            item._id,
            {
                average: Number(item.average.toFixed(2)),
                count: item.count,
            },
        ])
    );

    return products.map((product) => ({
        ...product,
        ratings: ratingsByProduct.get(String(product._id)) || {
            average: 0,
            count: 0,
        },
    }));
};

// -------------------------------------------------------------------
// 1. CREATE PRODUCT
// -------------------------------------------------------------------
exports.createProduct = wrapAsync(async (req, res, next) => {
    const {
        name,
        description,
        price,
        category,
        brand,
        stock,
        isActive,
        discountPrice,
    } = req.body;

    if (!name || !description || !price || !category) {
        throw new ExpressError(400, 'Required fields missing');
    }

    let productData = {
        name,
        description,
        brand,
        category,
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : 0,
        stock: stock || 'Available',
        isActive: isActive === 'true' || isActive === true,
        seller: req.user._id,
        images: [],
        variants: [],
        lifestyleImages: [],
    };

    if (req.body.flashDeal) {
        productData.flashDeal =
            typeof req.body.flashDeal === 'string'
                ? JSON.parse(req.body.flashDeal)
                : req.body.flashDeal;
    }

    if (req.body.techSpecs) {
        productData.techSpecs =
            typeof req.body.techSpecs === 'string'
                ? JSON.parse(req.body.techSpecs)
                : req.body.techSpecs;
    }

    if (req.body.lifestyleFeatures) {
        productData.lifestyleFeatures =
            typeof req.body.lifestyleFeatures === 'string'
                ? JSON.parse(req.body.lifestyleFeatures)
                : req.body.lifestyleFeatures;
    }

    if (req.body.highlights) {
        productData.highlights =
            typeof req.body.highlights === 'string'
                ? JSON.parse(req.body.highlights)
                : req.body.highlights;
    }

    if (req.body.inTheBox) {
        productData.inTheBox =
            typeof req.body.inTheBox === 'string'
                ? JSON.parse(req.body.inTheBox)
                : req.body.inTheBox;
    }

    // Promotional video
    if (req.body.promotionalVideo) {
        const parsedVideo =
            typeof req.body.promotionalVideo === 'string'
                ? JSON.parse(req.body.promotionalVideo)
                : req.body.promotionalVideo;

        productData.promotionalVideo = {
            videoUrl: parsedVideo.videoUrl || '',
            thumbnailUrl: parsedVideo.thumbnailUrl || '',
        };
    }

    // Bought together
    if (req.body.boughtTogether !== undefined) {
        try {
            if (req.body.boughtTogether === '') {
                productData.boughtTogether = [];
            } else {
                const parsedBT =
                    typeof req.body.boughtTogether === 'string'
                        ? JSON.parse(req.body.boughtTogether)
                        : req.body.boughtTogether;

                productData.boughtTogether = Array.isArray(parsedBT)
                    ? parsedBT.filter((id) => id && id.length === 24)
                    : [];
            }
        } catch (e) {
            productData.boughtTogether = [];
        }
    }

    // Lifestyle images metadata
    let lifestyleMeta = [];

    if (req.body.lifestyleMetadata) {
        try {
            lifestyleMeta =
                typeof req.body.lifestyleMetadata === 'string'
                    ? JSON.parse(req.body.lifestyleMetadata)
                    : req.body.lifestyleMetadata;
        } catch (e) {
            lifestyleMeta = [];
        }
    }

    const lifestyleFiles =
        req.files?.filter(
            (file) => file.fieldname === 'lifestyleImages'
        ) || [];

    let fileIndex = 0;
    let processedLifestyle = [];

    for (let i = 0; i < lifestyleMeta.length; i++) {
        const meta = lifestyleMeta[i];

        if (meta.type === 'existing' && meta.existingData) {
            processedLifestyle.push({
                image: meta.existingData.image || meta.existingData,
                title: meta.title || '',
                description: meta.description || '',
            });
        } else if (meta.type === 'new' && lifestyleFiles[fileIndex]) {
            const file = lifestyleFiles[fileIndex];
            fileIndex++;

            const optimizedBuffer = await sharp(file.buffer)
                .webp({ quality: 80 })
                .toBuffer();

            const key =
                `Products/Lifestyle/${Date.now()}-` +
                `${Math.random().toString(36).substring(2, 7)}.webp`;

            await r2.send(
                new PutObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: key,
                    Body: optimizedBuffer,
                    ContentType: 'image/webp',
                })
            );

            processedLifestyle.push({
                image: {
                    public_id: key,
                    url: `${process.env.R2_PUBLIC_URL}/${key}`,
                },
                title: meta.title || '',
                description: meta.description || '',
            });
        }
    }

    productData.lifestyleImages = processedLifestyle;

    // Variant images
    const variantImageFiles =
        req.files?.filter((file) =>
            file.fieldname.startsWith('variantImages_')
        ) || [];

    if (req.body.variants) {
        const variantsData =
            typeof req.body.variants === 'string'
                ? JSON.parse(req.body.variants)
                : req.body.variants;

        const processedVariants = [];

        for (let i = 0; i < variantsData.length; i++) {
            const v = variantsData[i];

            const variant = {
                color: v.color,
                size: v.size,
                stock: v.stock || 'Available',
                price: v.price ? Number(v.price) : null,
                images: [],
            };

            const thisVariantImages = variantImageFiles.filter(
                (file) => {
                    const match = file.fieldname.match(
                        /^variantImages_(\d+)_(\d+)$/
                    );

                    return match && parseInt(match[1]) === i;
                }
            );

            for (const variantFile of thisVariantImages) {
                const optimizedBuffer = await sharp(variantFile.buffer)
                    .webp({ quality: 80 })
                    .toBuffer();

                const key =
                    `Products/${Date.now()}-` +
                    `${Math.random().toString(36).substr(2, 5)}.webp`;

                await r2.send(
                    new PutObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Key: key,
                        Body: optimizedBuffer,
                        ContentType: 'image/webp',
                    })
                );

                variant.images.push({
                    public_id: key,
                    url: `${process.env.R2_PUBLIC_URL}/${key}`,
                });
            }

            processedVariants.push(variant);
        }

        productData.variants = processedVariants;

        if (processedVariants[0]?.images?.length > 0) {
            productData.images = [processedVariants[0].images[0]];
        }
    }

    const savedProduct = await Product.create(productData);

    res.status(201).json({
        success: true,
        product: savedProduct,
    });
});

// -------------------------------------------------------------------
// 2. GET ALL PRODUCTS
// -------------------------------------------------------------------
exports.getAllProducts = wrapAsync(async (req, res, next) => {
    const { category, brand, minPrice, maxPrice, color } = req.query;

    let filter = { isActive: true };

    if (category) {
        filter.category = { $in: category.split(',') };
    }

    if (brand) {
        filter.brand = { $in: brand.split(',') };
    }

    const products = await Product.find(filter)
        .select(
            'name price discountPrice images brand category flashDeal variants ratings highlights stock'
        )
        .lean();

    const productsWithRatings = await addApprovedRatings(products);

    res.status(200).json({
        success: true,
        count: productsWithRatings.length,
        products: productsWithRatings,
    });
});

// -------------------------------------------------------------------
// 3. GET SINGLE PRODUCT
// -------------------------------------------------------------------
exports.getProductDetails = wrapAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ExpressError(400, 'Invalid ID');
    }

    const product = await Product.findById(id)
        .populate(
            'boughtTogether',
            'name price discountPrice images brand category'
        )
        .lean();

    if (!product) {
        throw new ExpressError(404, 'Product not found');
    }

    const [productWithRatings] = await addApprovedRatings([product]);

    const currentTime = new Date();

    const isDealActive = !!(
        product.flashDeal?.isActive &&
        new Date(product.flashDeal.endTime) > currentTime
    );

    const relatedProducts = await Product.find({
        _id: { $ne: product._id },
        isActive: true,
        category: product.category,
    })
        .limit(4)
        .select('name price images brand')
        .lean();

    res.status(200).json({
        success: true,
        product: productWithRatings,
        isDealActive,
        relatedProducts,
    });
});

// -------------------------------------------------------------------
// 4. UPDATE PRODUCT
// -------------------------------------------------------------------
exports.updateProduct = wrapAsync(async (req, res, next) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
        throw new ExpressError(404, 'Product not found');
    }

    if (req.body.price) {
        req.body.price = Number(req.body.price);
    }

    if (req.body.flashDeal) {
        req.body.flashDeal =
            typeof req.body.flashDeal === 'string'
                ? JSON.parse(req.body.flashDeal)
                : req.body.flashDeal;
    }

    if (req.body.techSpecs) {
        req.body.techSpecs =
            typeof req.body.techSpecs === 'string'
                ? JSON.parse(req.body.techSpecs)
                : req.body.techSpecs;
    }

    if (req.body.lifestyleFeatures) {
        req.body.lifestyleFeatures =
            typeof req.body.lifestyleFeatures === 'string'
                ? JSON.parse(req.body.lifestyleFeatures)
                : req.body.lifestyleFeatures;
    }

    if (req.body.highlights) {
        req.body.highlights =
            typeof req.body.highlights === 'string'
                ? JSON.parse(req.body.highlights)
                : req.body.highlights;
    }

    if (req.body.inTheBox) {
        req.body.inTheBox =
            typeof req.body.inTheBox === 'string'
                ? JSON.parse(req.body.inTheBox)
                : req.body.inTheBox;
    }

    // Promotional video
    if (req.body.promotionalVideo) {
        const parsedVideo =
            typeof req.body.promotionalVideo === 'string'
                ? JSON.parse(req.body.promotionalVideo)
                : req.body.promotionalVideo;

        req.body.promotionalVideo = {
            videoUrl: parsedVideo.videoUrl || '',
            thumbnailUrl: parsedVideo.thumbnailUrl || '',
        };
    }

    // Bought together
    if (req.body.boughtTogether !== undefined) {
        try {
            if (req.body.boughtTogether === '') {
                req.body.boughtTogether = [];
            } else {
                const parsedBT =
                    typeof req.body.boughtTogether === 'string'
                        ? JSON.parse(req.body.boughtTogether)
                        : req.body.boughtTogether;

                req.body.boughtTogether = Array.isArray(parsedBT)
                    ? parsedBT.filter((id) => id && id.length === 24)
                    : [];
            }
        } catch (e) {
            req.body.boughtTogether = [];
        }
    }

    // Lifestyle images metadata
    let lifestyleMeta = [];

    if (req.body.lifestyleMetadata) {
        try {
            lifestyleMeta =
                typeof req.body.lifestyleMetadata === 'string'
                    ? JSON.parse(req.body.lifestyleMetadata)
                    : req.body.lifestyleMetadata;
        } catch (e) {
            lifestyleMeta = [];
        }
    }

    const lifestyleFiles =
        req.files?.filter(
            (file) => file.fieldname === 'lifestyleImages'
        ) || [];

    let fileIndex = 0;
    let updatedLifestyleImages = [];

    for (let i = 0; i < lifestyleMeta.length; i++) {
        const meta = lifestyleMeta[i];

        if (meta.type === 'existing' && meta.existingData) {
            updatedLifestyleImages.push({
                image: meta.existingData.image || meta.existingData,
                title: meta.title || '',
                description: meta.description || '',
            });
        } else if (meta.type === 'new' && lifestyleFiles[fileIndex]) {
            const file = lifestyleFiles[fileIndex];
            fileIndex++;

            const optimizedBuffer = await sharp(file.buffer)
                .webp({ quality: 80 })
                .toBuffer();

            const key =
                `Products/Lifestyle/${Date.now()}-` +
                `${Math.random().toString(36).substring(2, 7)}.webp`;

            await r2.send(
                new PutObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: key,
                    Body: optimizedBuffer,
                    ContentType: 'image/webp',
                })
            );

            updatedLifestyleImages.push({
                image: {
                    public_id: key,
                    url: `${process.env.R2_PUBLIC_URL}/${key}`,
                },
                title: meta.title || '',
                description: meta.description || '',
            });
        }
    }

    req.body.lifestyleImages = updatedLifestyleImages;

    // Variant images
    const variantImageFiles =
        req.files?.filter((file) =>
            file.fieldname.startsWith('variantImages_')
        ) || [];

    if (req.body.variants) {
        const variantsData =
            typeof req.body.variants === 'string'
                ? JSON.parse(req.body.variants)
                : req.body.variants;

        const processedVariants = [];

        for (let i = 0; i < variantsData.length; i++) {
            const v = variantsData[i];

            const variant = {
                color: v.color,
                size: v.size,
                stock: v.stock || 'Available',
                price: v.price ? Number(v.price) : null,
                images: v.existingImages || [],
            };

            const thisVariantImages = variantImageFiles.filter(
                (file) => {
                    const match = file.fieldname.match(
                        /^variantImages_(\d+)_(\d+)$/
                    );

                    return match && parseInt(match[1]) === i;
                }
            );

            for (const variantFile of thisVariantImages) {
                const optimizedBuffer = await sharp(variantFile.buffer)
                    .webp({ quality: 80 })
                    .toBuffer();

                const key =
                    `Products/${Date.now()}-` +
                    `${Math.random().toString(36).substr(2, 5)}.webp`;

                await r2.send(
                    new PutObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Key: key,
                        Body: optimizedBuffer,
                        ContentType: 'image/webp',
                    })
                );

                variant.images.push({
                    public_id: key,
                    url: `${process.env.R2_PUBLIC_URL}/${key}`,
                });
            }

            processedVariants.push(variant);
        }

        req.body.variants = processedVariants;

        if (processedVariants[0]?.images?.length > 0) {
            req.body.images = [processedVariants[0].images[0]];
        }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
            returnDocument: 'after',
            runValidators: true,
        }
    );

    res.status(200).json({
        success: true,
        product: updatedProduct,
    });
});

// -------------------------------------------------------------------
// 5. DELETE PRODUCT
// -------------------------------------------------------------------
exports.deleteProduct = wrapAsync(async (req, res, next) => {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
        throw new ExpressError(404, 'Product not found');
    }

    res.status(200).json({
        success: true,
        message: 'Product deleted',
    });
});

// -------------------------------------------------------------------
// 6. GET ADMIN PRODUCTS
// -------------------------------------------------------------------
exports.getAdminProducts = async (req, res, next) => {
    try {
        const products = await Product.find();

        res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// -------------------------------------------------------------------
// 7. TOGGLE FEATURED STATUS
// -------------------------------------------------------------------
exports.toggleFeaturedStatus = wrapAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ExpressError(404, 'Product not found'));
    }

    product.isFeatured = !product.isFeatured;
    await product.save();

    res.status(200).json({
        success: true,
        isFeatured: product.isFeatured,
    });
});