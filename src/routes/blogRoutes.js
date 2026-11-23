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
const { superAdminOnly } = require("../middleware/roleMiddleware");

const router = express.Router();

// Receive one image using the existing memory-storage middleware.
function receiveImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Image 5 MB ya usse chhoti honi chahiye."
            : "Ek baar mein sirf ek image upload karo. Field name image hona chahiye.",
      });
    }

    return next(error);
  });
}

// Super Admin image upload.
router.post(
  "/manage/upload-image",
  protect,
  superAdminOnly,
  receiveImage,
  uploadBlogImage
);

// Super Admin blog management.
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

// Public routes.
router.get("/", getPublishedBlogs);
router.get("/:slug", getBlogBySlug);

module.exports = router;