const SellerService = require("../services/SellerService");
const fileUploadService = require("../util/s3");
var ObjectId = require("mongoose").Types.ObjectId;

// simple regex escape (similar to used in UserController)
const RegexEscape = (s) =>
  s ? s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") : s;

module.exports = () => {
  /**
   * List of Sellers (Admin)
   */
  const getAllSellerList = async (req, res, next) => {
    console.log("SellerController => getAllSellerList");
    let { search, page, limit, status, isActive } = req.query;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;

    let query = { isDeleted: { $ne: true } };

    if (status) {
      query.status = status; // pending_profile / pending_approval / approved / rejected
    }

    if (typeof isActive !== "undefined") {
      query.isActive =
        isActive === "true" || isActive === 1 || isActive === "1";
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: RegexEscape(search), $options: "i" } },
        { mobile: { $regex: RegexEscape(search), $options: "i" } },
        { shopName: { $regex: RegexEscape(search), $options: "i" } },
      ];
    }

    let sellers = await SellerService().getSellers(query, page, limit);
    let total_seller = await SellerService().countSellers(query);

    req.msg = "sellers_list";
    req.rData = {
      search,
      status,
      isActive,
      page,
      limit,
      total_seller,
      sellers,
    };

    next();
  };

  /**
   * Seller Details (for Seller App or Admin)
   */
  const getDetails = async (req, res, next) => {
    console.log("SellerController => getDetails");
    let { sellerId } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    let seller = await SellerService().fetch(finalId);

    if (seller) {
      req.msg = "success";
      req.rData = seller;
    } else {
      req.rCode = 5;
      req.msg = "seller_not_found";
      req.rData = {};
    }

    next();
  };

  /**
   * Edit Seller Profile (Owner + Shop + Location + Images)
   * Used from Seller App
   */
  const editSellerProfile = async (req, res, next) => {
    console.log("SellerController => editSellerProfile");
    let { sellerId } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    let updateData = { ...req.body };

    // ----- OWNER IMAGE -----
    if (req.files && req.files.ownerImage) {
      const file = req.files.ownerImage;
      const uploadRes = await fileUploadService.uploadFileToAws(file);
      updateData.ownerImage = uploadRes.images;
    }

    // ----- SHOP LOGO -----
    if (req.files && req.files.shopLogo) {
      const file = req.files.shopLogo;
      const uploadRes = await fileUploadService.uploadFileToAws(file);
      updateData.shopLogo = uploadRes.images;
    }

    // ----- MULTIPLE SHOP IMAGES -----
    if (req.files && req.files.shopImages) {
      // can be single or array
      const files = Array.isArray(req.files.shopImages)
        ? req.files.shopImages
        : [req.files.shopImages];

      let imagesArr = [];

      for (const file of files) {
        const uploadRes = await fileUploadService.uploadFileToAws(file);
        // assuming uploadRes.images is url or array
        if (Array.isArray(uploadRes.images)) {
          uploadRes.images.forEach((url) => imagesArr.push({ url }));
        } else {
          imagesArr.push({ url: uploadRes.images });
        }
      }

      updateData.shopImages = imagesArr;
    }

    // ----- LOCATION (lat, lng) -----
    if (updateData.lat) updateData.lat = parseFloat(updateData.lat);
    if (updateData.lng) updateData.lng = parseFloat(updateData.lng);

    await SellerService().updateSeller(finalId, updateData);

    req.rData = {};
    req.msg = "success";
    next();
  };

  /**
   * Update KYC (GST / Aadhaar / PAN + Images)
   */
  const updateKyc = async (req, res, next) => {
    console.log("SellerController => updateKyc");
    let { sellerId } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    let updateData = {};

    let {
      gstNumber,
      aadhaarNumber,
      panNumber,
      gstVerified, // optional boolean
    } = req.body;

    if (gstNumber) updateData.gstNumber = gstNumber;
    if (aadhaarNumber) updateData.aadhaarNumber = aadhaarNumber;
    if (panNumber) updateData.panNumber = panNumber;

    if (typeof gstVerified !== "undefined") {
      updateData.gstVerified =
        gstVerified === true ||
        gstVerified === "true" ||
        gstVerified === 1 ||
        gstVerified === "1";
    }

    // GST certificate image
    if (req.files && req.files.gstCertificate) {
      const file = req.files.gstCertificate;
      const uploadRes = await fileUploadService.uploadFileToAws(file);
      updateData.gstCertificate = uploadRes.images;
    }

    // Aadhaar image
    if (req.files && req.files.aadhaarImage) {
      const file = req.files.aadhaarImage;
      const uploadRes = await fileUploadService.uploadFileToAws(file);
      updateData.aadhaarImage = uploadRes.images;
    }

    // PAN image
    if (req.files && req.files.panImage) {
      const file = req.files.panImage;
      const uploadRes = await fileUploadService.uploadFileToAws(file);
      updateData.panImage = uploadRes.images;
    }

    await SellerService().updateSeller(finalId, updateData);

    req.rData = {};
    req.msg = "success";
    next();
  };

  /**
   * Update Bank Details
   */
  const updateBankDetails = async (req, res, next) => {
    console.log("SellerController => updateBankDetails");
    let { sellerId } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    let { accountHolder, accountNumber, ifsc, bankName, upi, upiVerified } =
      req.body;

    let bankDetails = {};

    if (accountHolder) bankDetails.accountHolder = accountHolder;
    if (accountNumber) bankDetails.accountNumber = accountNumber;
    if (ifsc) bankDetails.ifsc = ifsc;
    if (bankName) bankDetails.bankName = bankName;
    if (upi) bankDetails.upi = upi;
    if (typeof upiVerified !== "undefined") {
      bankDetails.upiVerified =
        upiVerified === true ||
        upiVerified === "true" ||
        upiVerified === 1 ||
        upiVerified === "1";
    }

    await SellerService().updateSeller(finalId, { bankDetails });

    req.rData = {};
    req.msg = "success";
    next();
  };

  /**
   * Update Shop Timing
   */
  const updateShopTiming = async (req, res, next) => {
    console.log("SellerController => updateShopTiming");
    let { sellerId } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    let { openingTime, closingTime, weeklyOff } = req.body;

    let updateData = {};
    if (openingTime) updateData.openingTime = openingTime;
    if (closingTime) updateData.closingTime = closingTime;
    if (weeklyOff) updateData.weeklyOff = weeklyOff;

    await SellerService().updateSeller(finalId, updateData);

    req.rData = {};
    req.msg = "success";
    next();
  };

  /**
   * Activate / Deactivate Seller
   * (Admin)
   */
  const activateDeactivateSeller = async (req, res, next) => {
    console.log("SellerController => activateDeactivateSeller");
    let { sellerId } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    let seller = await SellerService().fetch(finalId);

    if (!seller) {
      req.rCode = 5;
      req.msg = "seller_not_found";
      req.rData = {};
      return next();
    }

    let isActive = !seller.isActive;
    await SellerService().updateSeller(finalId, { isActive });

    req.msg = "status_changed";
    req.rData = { isActive };
    next();
  };

  /**
   * Soft Delete Seller
   * (Admin)
   */
  const deleteSeller = async (req, res, next) => {
    console.log("SellerController => deleteSeller");
    let { sellerId } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    await SellerService().updateSeller(finalId, {
      isDeleted: true,
      isActive: false,
    });

    req.msg = "success";
    req.rData = {};
    next();
  };

  /**
   * Approve Seller (Admin)
   */
  const approveSeller = async (req, res, next) => {
    console.log("SellerController => approveSeller");
    let { sellerId } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    let seller = await SellerService().updateSeller(finalId, {
      status: "approved",
      approvedAt: new Date(),
      rejectedAt: null,
      rejectedReason: "",
    });

    req.msg = "seller_approved";
    req.rData = seller;
    next();
  };

  /**
   * Reject Seller (Admin)
   */
  const rejectSeller = async (req, res, next) => {
    console.log("SellerController => rejectSeller");
    let { sellerId, reason } = req.body;
    let { id } = req.params;

    const finalId = sellerId || id;

    let seller = await SellerService().updateSeller(finalId, {
      status: "rejected",
      rejectedAt: new Date(),
      approvedAt: null,
      rejectedReason: reason || "",
    });

    req.msg = "seller_rejected";
    req.rData = seller;
    next();
  };

  return {
    /**
     * List / details
     */
    getAllSellerList,
    getDetails,

    /**
     * Seller self profile / shop
     */
    editSellerProfile,
    updateKyc,
    updateBankDetails,
    updateShopTiming,

    /**
     * Admin actions
     */
    activateDeactivateSeller,
    deleteSeller,
    approveSeller,
    rejectSeller,
  };
};
