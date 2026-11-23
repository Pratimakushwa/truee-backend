const express = require("express");
const multer = require("multer");

const {
  getPublishedBlogs,
  getBlogBySlug,
  getAllBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogController");

const {
  uploadBlogImage,
} = require("../controllers/blogUploadController");

const upload = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");

const {
  superAdminOnly,
} = require("../middleware/roleMiddleware");

const router = express.Router();

function receiveImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Image must be 5 MB or smaller."
            : "Please upload one image in the image field.",
      });
    }

    next(error);
  });
}

// Only Super Admin can upload blog images.
router.post(
  "/manage/upload-image",
  protect,
  superAdminOnly,
  receiveImage,
  uploadBlogImage
);

router.get(
  "/manage/all",
  protect,
  superAdminOnly,
  getAllBlogs
);

router.post(
  "/manage",
  protect,
  superAdminOnly,
  createBlog
);

router.put(
  "/manage/:id",
  protect,
  superAdminOnly,
  updateBlog
);

router.delete(
  "/manage/:id",
  protect,
  superAdminOnly,
  deleteBlog
);

// Public: published blogs only.
router.get("/", getPublishedBlogs);
router.get("/:slug", getBlogBySlug);

module.exports = router;