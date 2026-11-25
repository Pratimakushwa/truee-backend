const mongoose = require('mongoose');

const HEADER_GROUPS = [
    'SPEAKERS',
    'HEADPHONES',
    'EARPHONES',
    'SMARTWATCHES',
    'BEAUTY & WELLNESS',
    'HOME THEATER',
];

const productOptionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ['category', 'brand'],
            trim: true,
            lowercase: true,
        },
        value: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        normalized: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        menuGroup: {
            type: String,
            enum: [...HEADER_GROUPS, null],
            default: null,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

productOptionSchema.pre('validate', function () {
    if (typeof this.value === 'string') {
        this.value = this.value.trim();
        this.normalized = this.value.toLowerCase();
    }

    if (this.type === 'brand') {
        this.menuGroup = null;
    }
});

productOptionSchema.index(
    { type: 1, normalized: 1 },
    { unique: true, name: 'unique_product_option_type_normalized' }
);

module.exports =
    mongoose.models.ProductOption ||
    mongoose.model('ProductOption', productOptionSchema);
