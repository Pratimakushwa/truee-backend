// const PageContent = require("../models/pageContentModel");
// const wrapAsync = require("../utils/wrapAsync");
// const ExpressError = require("../utils/expressError");

// function checkPage(pageKey) {
//   if (pageKey !== "home") {
//     throw new ExpressError(404, "Page not supported.");
//   }
// }

// function checkBody(body) {
//   if (!body || typeof body !== "object" || Array.isArray(body)) {
//     throw new ExpressError(400, "Invalid request body.");
//   }

//   const allowed = ["seo", "content", "revision"];

//   if (Object.keys(body).some((key) => !allowed.includes(key))) {
//     throw new ExpressError(400, "Unknown content field.");
//   }

//   if (
//     !body.seo ||
//     typeof body.seo !== "object" ||
//     Array.isArray(body.seo) ||
//     !body.content ||
//     typeof body.content !== "object" ||
//     Array.isArray(body.content)
//   ) {
//     throw new ExpressError(400, "SEO and content are required.");
//   }

//   if (
//     !Number.isInteger(body.revision) ||
//     body.revision < 0
//   ) {
//     throw new ExpressError(400, "A valid revision is required.");
//   }
// }

// function validationError(error) {
//   if (
//     error.name === "ValidationError" ||
//     error.name === "StrictModeError" ||
//     error.name === "CastError"
//   ) {
//     throw new ExpressError(400, error.message);
//   }

//   throw error;
// }

// function editableResponse(page) {
//   return {
//     success: true,
//     data: {
//       pageKey: page.pageKey,
//       draft: page.draft,
//       published: page.published,
//       revision: page.revision,
//       publishedAt: page.publishedAt,
//       updatedAt: page.updatedAt,
//     },
//   };
// }

// // Public: published content only. Draft is never returned.
// exports.getPublishedContent = wrapAsync(async (req, res) => {
//   checkPage(req.params.pageKey);

//   const page = await PageContent.findOne({
//     pageKey: req.params.pageKey,
//   })
//     .select("published publishedAt")
//     .lean();

//   res.set("Cache-Control", "no-store");

//   res.status(200).json({
//     success: true,
//     data: page?.published || null,
//     publishedAt: page?.publishedAt || null,
//   });
// });

// // Super Admin: get the saved draft and published version.
// exports.getManagedContent = wrapAsync(async (req, res) => {
//   checkPage(req.params.pageKey);

//   const page = await PageContent.findOne({
//     pageKey: req.params.pageKey,
//   });

//   res.set("Cache-Control", "no-store");

//   if (!page) {
//     return res.status(200).json({
//       success: true,
//       data: {
//         pageKey: req.params.pageKey,
//         draft: null,
//         published: null,
//         revision: 0,
//         publishedAt: null,
//         updatedAt: null,
//       },
//     });
//   }

//   res.status(200).json(editableResponse(page));
// });

// async function saveVersion(req, res, publish) {
//   const { pageKey } = req.params;

//   checkPage(pageKey);
//   checkBody(req.body);

//   // Validate and normalise using the schema before saving.
//   let version;

//   try {
//     const candidate = new PageContent({
//       pageKey,
//       draft: {
//         seo: req.body.seo,
//         content: req.body.content,
//       },
//     });

//     await candidate.validate();

//     version = candidate.draft.toObject();
//   } catch (error) {
//     validationError(error);
//   }

//   const revision = req.body.revision;
//   const existing = await PageContent.findOne({ pageKey });

//   if (!existing) {
//     if (revision !== 0) {
//       throw new ExpressError(
//         409,
//         "Content changed. Reload the editor before saving."
//       );
//     }

//     try {
//       const page = await PageContent.create({
//         pageKey,
//         draft: version,
//         published: publish ? version : null,
//         publishedAt: publish ? new Date() : null,
//         revision: 1,
//         updatedBy: req.user._id,
//       });

//       return res.status(200).json({
//         ...editableResponse(page),
//         message: publish
//           ? "Content published successfully."
//           : "Draft saved successfully.",
//       });
//     } catch (error) {
//       if (error.code === 11000) {
//         throw new ExpressError(
//           409,
//           "Content changed. Reload the editor before saving."
//         );
//       }

//       validationError(error);
//     }
//   }

//   const changes = {
//     draft: version,
//     updatedBy: req.user._id,
//   };

//   if (publish) {
//     changes.published = version;
//     changes.publishedAt = new Date();
//   }

//   const page = await PageContent.findOneAndUpdate(
//     { pageKey, revision },
//     {
//       $set: changes,
//       $inc: { revision: 1 },
//     },
//     {
//       new: true,
//       runValidators: true,
//     }
//   );

//   if (!page) {
//     throw new ExpressError(
//       409,
//       "Content changed in another session. Reload before saving."
//     );
//   }

//   res.status(200).json({
//     ...editableResponse(page),
//     message: publish
//       ? "Content published successfully."
//       : "Draft saved successfully.",
//   });
// }

// exports.saveDraft = wrapAsync(async (req, res) => {
//   await saveVersion(req, res, false);
// });

// exports.publishContent = wrapAsync(async (req, res) => {
//   await saveVersion(req, res, true);
// });

const PageContent = require("../models/pageContentModel");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/expressError");

function checkPage(pageKey) {
  const supportedPages = PageContent.getSupportedPageKeys();

  if (
    typeof pageKey !== "string" ||
    !supportedPages.includes(pageKey)
  ) {
    throw new ExpressError(404, "Page not supported.");
  }
}

function checkBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ExpressError(400, "Invalid request body.");
  }

  const allowed = ["seo", "content", "revision"];

  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    throw new ExpressError(400, "Unknown content field.");
  }

  if (
    !body.seo ||
    typeof body.seo !== "object" ||
    Array.isArray(body.seo) ||
    !body.content ||
    typeof body.content !== "object" ||
    Array.isArray(body.content)
  ) {
    throw new ExpressError(400, "SEO and content are required.");
  }

  if (
    !Number.isInteger(body.revision) ||
    body.revision < 0
  ) {
    throw new ExpressError(400, "A valid revision is required.");
  }
}

function validationError(error) {
  if (
    error.name === "ValidationError" ||
    error.name === "StrictModeError" ||
    error.name === "CastError"
  ) {
    throw new ExpressError(400, error.message);
  }

  throw error;
}

function editableResponse(page) {
  return {
    success: true,
    data: {
      pageKey: page.pageKey,
      draft: page.draft,
      published: page.published,
      revision: page.revision,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
    },
  };
}

// Public endpoint: published content only.
// Draft content is never returned.
exports.getPublishedContent = wrapAsync(async (req, res) => {
  const { pageKey } = req.params;

  checkPage(pageKey);

  const page = await PageContent.findOne({ pageKey })
    .select("published publishedAt")
    .lean();

  res.set("Cache-Control", "no-store");

  res.status(200).json({
    success: true,
    data: page?.published || null,
    publishedAt: page?.publishedAt || null,
  });
});

// Protected by protect + superAdminOnly in the routes file.
exports.getManagedContent = wrapAsync(async (req, res) => {
  const { pageKey } = req.params;

  checkPage(pageKey);

  const page = await PageContent.findOne({ pageKey });

  res.set("Cache-Control", "no-store");

  if (!page) {
    return res.status(200).json({
      success: true,
      data: {
        pageKey,
        draft: null,
        published: null,
        revision: 0,
        publishedAt: null,
        updatedAt: null,
      },
    });
  }

  res.status(200).json(editableResponse(page));
});

async function saveVersion(req, res, publish) {
  const { pageKey } = req.params;

  checkPage(pageKey);
  checkBody(req.body);

  let version;

  try {
    const candidate = new PageContent({
      pageKey,
      draft: {
        seo: req.body.seo,
        content: req.body.content,
      },
    });

    await candidate.validate();

    version = candidate.draft.toObject();
  } catch (error) {
    validationError(error);
  }

  const revision = req.body.revision;
  const existing = await PageContent.findOne({ pageKey });

  if (!existing) {
    if (revision !== 0) {
      throw new ExpressError(
        409,
        "Content changed. Reload the editor before saving."
      );
    }

    try {
      const page = await PageContent.create({
        pageKey,
        draft: version,
        published: publish ? version : null,
        publishedAt: publish ? new Date() : null,
        revision: 1,
        updatedBy: req.user._id,
      });

      return res.status(200).json({
        ...editableResponse(page),
        message: publish
          ? "Content published successfully."
          : "Draft saved successfully.",
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new ExpressError(
          409,
          "Content changed. Reload the editor before saving."
        );
      }

      validationError(error);
    }
  }

  const changes = {
    draft: version,
    updatedBy: req.user._id,
  };

  if (publish) {
    changes.published = version;
    changes.publishedAt = new Date();
  }

  let page;

  try {
    page = await PageContent.findOneAndUpdate(
      { pageKey, revision },
      {
        $set: changes,
        $inc: { revision: 1 },
      },
      {
        new: true,
        runValidators: true,
      }
    );
  } catch (error) {
    validationError(error);
  }

  if (!page) {
    throw new ExpressError(
      409,
      "Content changed in another session. Reload before saving."
    );
  }

  res.status(200).json({
    ...editableResponse(page),
    message: publish
      ? "Content published successfully."
      : "Draft saved successfully.",
  });
}

exports.saveDraft = wrapAsync(async (req, res) => {
  await saveVersion(req, res, false);
});

exports.publishContent = wrapAsync(async (req, res) => {
  await saveVersion(req, res, true);
});