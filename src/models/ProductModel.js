




// const mongoose = require('mongoose');

// const productSchema = new mongoose.Schema(
//     {
//         name: {
//             type: String,
//             required: true,
//         },

//         description: {
//             type: String,
//             required: true,
//         },

//         brand: {
//             type: String,
//         },

//         category: {
//             type: String,
//         },

//         price: {
//             type: Number,
//         },

//         discountPrice: {
//             type: Number,
//             default: 0,
//         },

//         stock: {
//             type: String,
//             default: 'Available',
//         },

//         isActive: {
//             type: Boolean,
//             default: true,
//         },

//         seller: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'User',
//         },

//         images: [
//             {
//                 public_id: String,
//                 url: String,
//             },
//         ],

//         // Lifestyle images
//         lifestyleImages: [
//             {
//                 image: {
//                     public_id: String,
//                     url: String,
//                 },
//                 title: {
//                     type: String,
//                     default: '',
//                 },
//                 description: {
//                     type: String,
//                     default: '',
//                 },
//             },
//         ],

//         // Product variants
//         variants: [
//             {
//                 color: String,
//                 size: String,
//                 stock: String,
//                 price: Number,
//                 images: [
//                     {
//                         public_id: String,
//                         url: String,
//                     },
//                 ],
//             },
//         ],

//         // Flash deal
//         flashDeal: {
//             isActive: Boolean,
//             dealPrice: Number,
//             startTime: Date,
//             endTime: Date,
//         },

//         // Technical specifications
//         techSpecs: [
//             {
//                 category: String,
//                 description: String,
//                 details: [String],
//             },
//         ],

//         // Lifestyle features
//         lifestyleFeatures: [
//             {
//                 title: String,
//                 description: String,
//                 imageUrl: String,
//             },
//         ],

//         // Highlights
//         highlights: [
//             {
//                 iconName: String,
//                 title: String,
//             },
//         ],

//         // Promotional video
//         promotionalVideo: {
//             videoUrl: {
//                 type: String,
//                 default: '',
//             },
//             thumbnailUrl: {
//                 type: String,
//                 default: '',
//             },
//         },

//         inTheBox: [String],

//         // Bought together products
//         boughtTogether: [
//             {
//                 type: mongoose.Schema.Types.ObjectId,
//                 ref: 'Product',
//             },
//         ],

//         // Review IDs linked by reviewController.js.
//         // Public rating is calculated from Approved reviews only.
//         reviews: [
//             {
//                 type: mongoose.Schema.Types.ObjectId,
//                 ref: 'Review',
//             },
//         ],
//     },
//     {
//         timestamps: true,
//     }
// );

// module.exports =
//     mongoose.models.Product ||
//     mongoose.model('Product', productSchema);

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
        },

        // Optional product SEO.
        // Blank values use the existing automatic SEO.
        seoTitle: {
            type: String,
            trim: true,
            maxlength: 200,
            default: '',
        },

        seoDescription: {
            type: String,
            trim: true,
            maxlength: 500,
            default: '',
        },

        brand: {
            type: String,
        },

        category: {
            type: String,
        },

        price: {
            type: Number,
        },

        discountPrice: {
            type: Number,
            default: 0,
        },

        stock: {
            type: String,
            default: 'Available',
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        images: [
            {
                public_id: String,
                url: String,
            },
        ],

        // Lifestyle images
        lifestyleImages: [
            {
                image: {
                    public_id: String,
                    url: String,
                },
                title: {
                    type: String,
                    default: '',
                },
                description: {
                    type: String,
                    default: '',
                },
            },
        ],

        // Product variants
        variants: [
            {
                color: String,
                size: String,
                stock: String,
                price: Number,
                images: [
                    {
                        public_id: String,
                        url: String,
                    },
                ],
            },
        ],

        // Flash deal
        flashDeal: {
            isActive: Boolean,
            dealPrice: Number,
            startTime: Date,
            endTime: Date,
        },

        // Technical specifications
        techSpecs: [
            {
                category: String,
                description: String,
                details: [String],
            },
        ],

        // Lifestyle features
        lifestyleFeatures: [
            {
                title: String,
                description: String,
                imageUrl: String,
            },
        ],

        // Highlights
        highlights: [
            {
                iconName: String,
                title: String,
            },
        ],

        // Promotional video
        promotionalVideo: {
            videoUrl: {
                type: String,
                default: '',
            },
            thumbnailUrl: {
                type: String,
                default: '',
            },
        },

        inTheBox: [String],

        // Bought together products
        boughtTogether: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
        ],

        // Review IDs linked by reviewController.js.
        // Public rating is calculated from Approved reviews only.
        reviews: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Review',
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports =
    mongoose.models.Product ||
    mongoose.model('Product', productSchema);