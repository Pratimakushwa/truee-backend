// const mongoose = require("mongoose");

// const textField = (maxLength) => ({
//   type: String,
//   trim: true,
//   maxlength: maxLength,
//   default: "",
// });

// const safeImage = (value) => {
//   if (!value) return true;

//   if (value.startsWith("/") && !value.startsWith("//")) {
//     return !/[\\\s]/.test(value);
//   }

//   try {
//     const url = new URL(value);
//     return (
//       url.protocol === "https:" &&
//       !url.username &&
//       !url.password
//     );
//   } catch {
//     return false;
//   }
// };

// const imageField = {
//   ...textField(2000),
//   validate: {
//     validator: safeImage,
//     message: "Image must use HTTPS or a local /path.",
//   },
// };

// const schemaOptions = {
//   _id: false,
//   strict: "throw",
// };

// const seoSchema = new mongoose.Schema(
//   {
//     title: textField(200),
//     description: textField(500),

//     canonicalUrl: {
//       ...textField(2000),
//       validate: {
//         validator(value) {
//           if (!value) return true;

//           try {
//             const url = new URL(value);

//             return (
//               url.protocol === "https:" &&
//               ["truee.in", "www.truee.in"].includes(url.hostname) &&
//               !url.username &&
//               !url.password &&
//               !url.hash
//             );
//           } catch {
//             return false;
//           }
//         },
//         message: "Canonical must be an HTTPS truee.in URL.",
//       },
//     },

//     noIndex: {
//       type: Boolean,
//       default: false,
//     },

//     socialTitle: textField(200),
//     socialDescription: textField(500),
//     socialImage: imageField,
//     socialImageAlt: textField(250),
//   },
//   schemaOptions
// );

// const slideSchema = new mongoose.Schema(
//   {
//     id: {
//       type: Number,
//       required: true,
//       enum: [1, 2, 3, 4, 5],
//     },
//     title: textField(200),
//     subtitle: textField(1000),
//     image: imageField,
//     alt: textField(250),
//     shopButtonText: textField(80),
//     browseButtonText: textField(80),
//   },
//   schemaOptions
// );

// const contentSchema = new mongoose.Schema(
//   {
//     mainHeading: textField(250),
//     mainDescription: textField(3000),

//     journalEyebrow: textField(100),
//     journalHeading: textField(250),
//     journalDescription: textField(1000),
//     journalButtonText: textField(80),
//     articleButtonText: textField(80),

//     heroSlides: {
//       type: [slideSchema],
//       default: [],
//       validate: {
//         validator(slides) {
//           const ids = slides.map((slide) => slide.id);

//           return (
//             slides.length <= 5 &&
//             new Set(ids).size === ids.length
//           );
//         },
//         message: "Each hero slide ID must be unique; maximum 5 slides.",
//       },
//     },
//   },
//   schemaOptions
// );

// const pageVersionSchema = new mongoose.Schema(
//   {
//     seo: {
//       type: seoSchema,
//       default: () => ({}),
//     },
//     content: {
//       type: contentSchema,
//       default: () => ({}),
//     },
//   },
//   schemaOptions
// );

// const pageContentSchema = new mongoose.Schema(
//   {
//     pageKey: {
//       type: String,
//       required: true,
//       unique: true,
//       enum: ["home"],
//     },

//     draft: {
//       type: pageVersionSchema,
//       default: () => ({}),
//     },

//     published: {
//       type: pageVersionSchema,
//       default: null,
//     },

//     revision: {
//       type: Number,
//       default: 0,
//     },

//     publishedAt: {
//       type: Date,
//       default: null,
//     },

//     updatedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//   },
//   {
//     timestamps: true,
//     strict: "throw",
//   }
// );

// module.exports = mongoose.model(
//   "PageContent",
//   pageContentSchema
// );

const mongoose = require("mongoose");

// Supported public pages.
// Frontend editor and controller will use these same keys.
const PAGE_KEYS = [
  "home",
  "shop",
  "products",
  "brands",
  "about",
  "contact",
  "privacy-policy",
  "terms",
  "refund-policy",
  "shipping-policy",
  "blog",
];

const textField = (maxLength) => ({
  type: String,
  trim: true,
  maxlength: maxLength,
  default: "",
});

const safeImage = (value) => {
  if (!value) return true;

  if (value.startsWith("/") && !value.startsWith("//")) {
    return !/[\\\s]/.test(value);
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

const imageField = {
  ...textField(2000),
  validate: {
    validator: safeImage,
    message: "Image must use HTTPS or a local /path.",
  },
};

const schemaOptions = {
  _id: false,
  strict: "throw",
};

// SEO fields shared by all supported pages.
const seoSchema = new mongoose.Schema(
  {
    title: textField(200),
    description: textField(500),

    canonicalUrl: {
      ...textField(2000),
      validate: {
        validator(value) {
          if (!value) return true;

          try {
            const url = new URL(value);

            return (
              url.protocol === "https:" &&
              ["truee.in", "www.truee.in"].includes(
                url.hostname
              ) &&
              !url.username &&
              !url.password &&
              !url.hash
            );
          } catch {
            return false;
          }
        },
        message: "Canonical must be an HTTPS truee.in URL.",
      },
    },

    noIndex: {
      type: Boolean,
      default: false,
    },

    socialTitle: textField(200),
    socialDescription: textField(500),
    socialImage: imageField,
    socialImageAlt: textField(250),
  },
  schemaOptions
);

// Existing Home banner fields.
const slideSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5],
    },

    title: textField(200),
    subtitle: textField(1000),
    image: imageField,
    alt: textField(250),
    shopButtonText: textField(80),
    browseButtonText: textField(80),
  },
  schemaOptions
);

// Existing Home content fields are preserved.
// Other pages will initially use only their SEO fields.
const contentSchema = new mongoose.Schema(
  {
    mainHeading: textField(250),
    mainDescription: textField(3000),

    journalEyebrow: textField(100),
    journalHeading: textField(250),
    journalDescription: textField(1000),
    journalButtonText: textField(80),
    articleButtonText: textField(80),

    heroSlides: {
      type: [slideSchema],
      default: [],
      validate: {
        validator(slides) {
          const ids = slides.map((slide) => slide.id);

          return (
            slides.length <= 5 &&
            new Set(ids).size === ids.length
          );
        },
        message:
          "Each hero slide ID must be unique; maximum 5 slides.",
      },
    },
  },
  schemaOptions
);

const pageVersionSchema = new mongoose.Schema(
  {
    seo: {
      type: seoSchema,
      default: () => ({}),
    },

    content: {
      type: contentSchema,
      default: () => ({}),
    },
  },
  schemaOptions
);

const pageContentSchema = new mongoose.Schema(
  {
    pageKey: {
      type: String,
      required: true,
      unique: true,
      enum: PAGE_KEYS,
    },

    draft: {
      type: pageVersionSchema,
      default: () => ({}),
    },

    published: {
      type: pageVersionSchema,
      default: null,
    },

    revision: {
      type: Number,
      default: 0,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

// Lets the controller reuse the supported page list.
pageContentSchema.statics.getSupportedPageKeys = function () {
  return [...PAGE_KEYS];
};

module.exports = mongoose.model(
  "PageContent",
  pageContentSchema
);