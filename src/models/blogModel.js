const mongoose = require("mongoose");

const validImageUrl = (value) => {
  if (!value) return true;

  // Local public image or HTTPS image.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Plain text article; paragraphs separated by new lines.
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100000,
    },

    category: {
      type: String,
      trim: true,
      default: "Education & Technology",
      maxlength: 100,
    },

    authorName: {
      type: String,
      trim: true,
      default: "Truee",
      maxlength: 100,
    },

    coverImage: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: validImageUrl,
        message: "Use an HTTPS image URL or a local image path.",
      },
    },

    coverImageAlt: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250,
    },

    logoImage: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: validImageUrl,
        message: "Use an HTTPS logo URL or a local image path.",
      },
    },

    logoAlt: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    seoTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    seoDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    showOnHome: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });

module.exports =
  mongoose.models.Blog || mongoose.model("Blog", blogSchema);