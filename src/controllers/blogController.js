const mongoose = require("mongoose");
const Blog = require("../models/blogModel");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/expressError");

const editableFields = [
  "title",
  "slug",
  "excerpt",
  "content",
  "category",
  "authorName",
  "coverImage",
  "coverImageAlt",
  "logoImage",
  "logoAlt",
  "seoTitle",
  "seoDescription",
  "status",
  "showOnHome",
];

const makeSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function getInput(body) {
  const input = {};

  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      input[field] = body[field];
    }
  }

  const stringFields = editableFields.filter(
    (field) => field !== "showOnHome"
  );

  for (const field of stringFields) {
    if (
      input[field] !== undefined &&
      typeof input[field] !== "string"
    ) {
      throw new ExpressError(400, `${field} must be text.`);
    }
  }

  if (
    input.showOnHome !== undefined &&
    typeof input.showOnHome !== "boolean"
  ) {
    throw new ExpressError(
      400,
      "showOnHome must be true or false."
    );
  }

  if (
    input.status !== undefined &&
    !["draft", "published"].includes(input.status)
  ) {
    throw new ExpressError(400, "Invalid blog status.");
  }

  return input;
}

function checkId(id) {
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    throw new ExpressError(400, "Invalid blog ID.");
  }
}

function validateArticle(blog) {
  for (const field of ["title", "slug", "excerpt", "content"]) {
    if (!blog[field] || !blog[field].trim()) {
      throw new ExpressError(400, `${field} is required.`);
    }
  }

  if (blog.status === "published") {
    if (!blog.coverImage || !blog.coverImageAlt?.trim()) {
      throw new ExpressError(
        400,
        "Publishing requires a cover image and its alt text."
      );
    }

    if (blog.logoImage && !blog.logoAlt?.trim()) {
      throw new ExpressError(
        400,
        "Please add alt text for the logo."
      );
    }
  }
}

async function saveBlog(blog) {
  try {
    return await blog.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new ExpressError(
        409,
        "This slug is already used. Choose another slug."
      );
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)
        .map((item) => item.message)
        .join(" ");

      throw new ExpressError(400, message);
    }

    throw error;
  }
}

// Public: published blog cards only.
exports.getPublishedBlogs = wrapAsync(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit, 10) || 9)
  );

  const filter = { status: "published" };

  if (req.query.home === "true") {
    filter.showOnHome = true;
  }

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .select(
        "title slug excerpt category authorName coverImage " +
        "coverImageAlt logoImage logoAlt publishedAt"
      )
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Blog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    blogs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// Public: single published article.
exports.getBlogBySlug = wrapAsync(async (req, res) => {
  const blog = await Blog.findOne({
    slug: req.params.slug,
    status: "published",
  })
    .select("-createdBy -__v")
    .lean();

  if (!blog) {
    throw new ExpressError(404, "Blog not found.");
  }

  res.status(200).json({ success: true, blog });
});

// Super Admin: includes drafts.
exports.getAllBlogs = wrapAsync(async (req, res) => {
  const blogs = await Blog.find()
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, blogs });
});

exports.createBlog = wrapAsync(async (req, res) => {
  const input = getInput(req.body);

  input.slug = makeSlug(input.slug || input.title);

  const blog = new Blog({
    ...input,
    createdBy: req.user._id || req.user.id,
  });

  validateArticle(blog);

  if (blog.status === "published") {
    blog.publishedAt = new Date();
  }

  await saveBlog(blog);

  res.status(201).json({
    success: true,
    message: "Blog saved successfully.",
    blog,
  });
});

exports.updateBlog = wrapAsync(async (req, res) => {
  checkId(req.params.id);

  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw new ExpressError(404, "Blog not found.");
  }

  const input = getInput(req.body);

  if (input.slug !== undefined) {
    input.slug = makeSlug(input.slug);
  }

  Object.assign(blog, input);
  validateArticle(blog);

  if (blog.status === "published" && !blog.publishedAt) {
    blog.publishedAt = new Date();
  }

  await saveBlog(blog);

  res.status(200).json({
    success: true,
    message: "Blog updated successfully.",
    blog,
  });
});

exports.deleteBlog = wrapAsync(async (req, res) => {
  checkId(req.params.id);

  const blog = await Blog.findByIdAndDelete(req.params.id);

  if (!blog) {
    throw new ExpressError(404, "Blog not found.");
  }

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully.",
  });
});