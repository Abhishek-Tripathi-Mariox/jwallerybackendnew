const UserService = require("../services/UserService");
const fileUploadService = require("../util/s3");
const UserAddressService = require("../services/UserAddressService");
const { reverseGeocode } = require("../util/googleMaps");
const User = require("../models/User");
const UserAddress = require("../models/UserAddress");
var ObjectId = require("mongoose").Types.ObjectId;

module.exports = () => {
  /**
   * Self-service account deletion (Google Play Data Safety requirement —
   * must work without needing the app installed, hence also exposed on the
   * website). Anonymizes PII and soft-deletes rather than hard-deleting so
   * existing orders (which reference this user) stay intact for business/
   * tax records; the account itself becomes unusable (isActive: false is
   * checked by verifyUserToken on every subsequent request).
   */
  const deleteAccount = async (req, res, next) => {
    console.log("UserController => deleteAccount");
    const { userId } = req.body;

    await User.findByIdAndUpdate(userId, {
      isDeleted: true,
      isActive: false,
      notificationAllowed: false,
      fullName: "",
      email: "",
      profileImages: "",
      dob: "",
      address: "",
      city: "",
      pincode: "",
      deviceToken: "",
      deviceType: "",
    });

    await UserAddress.updateMany({ userId }, { isActive: false });

    req.rData = null;
    req.msg = "account_deleted";
    next();
  };

  const updateDeviceToken = async (req, res, next) => {
    console.log("UserController => updateDeviceToken");
    let { userId, deviceToken, deviceType } = req.body;

    let user = { deviceToken, deviceType };

    await UserService().updateUsers(userId, user);

    req.rData = {};
    req.msg = "success";
    next();
  };

  /**
   * List of Users
   */
  const getAllUserList = async (req, res, next) => {
    console.log("UserController => getAllUserList");
    let { search, page, limit } = req.query;
    let { UserId } = req.body;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;

    let query = {};

    if (UserId) {
      query._id = { $ne: UserId };
    }

    if (search) {
      query = {
        $or: [
          {
            fullName: { $regex: RegexEscape(search), $options: "i" },
          },
          {
            username: { $regex: RegexEscape(search), $options: "i" },
          },
        ],
      };
    }

    let user = await UserService().getUsers(query, page, limit);
    let total_user = await UserService().countUsers(query);

    req.msg = "users_list";

    req.rData = {
      search,
      page,
      limit,
      total_user,
      user,
    };

    next();
  };

  const getDetails = async (req, res, next) => {
    console.log("UserController => getDetails");
    let { userId } = req.body;
    let user = await UserService().fetch(userId);

    if (user) {
      req.msg = "success";
      req.rData = user;
    } else {
      req.rCode = 5;
      req.msg = "user_not_found";
      req.rData = {};
    }

    next();
  };

  const editUser = async (req, res, next) => {
    console.log("UserController => editUser");
    let { longitude, latitude, userId } = req.body;
    let profileImages = "";
    let { id } = req.params;

    id = userId;
    if (req.files && req.files.profileImages) {
      const file = req.files.profileImages;

      const uploadRes = await fileUploadService.uploadFileToAws(file);
      profileImages = uploadRes.images;
      req.body.profileImages = profileImages;
    }

    // ✅ Update Location if coordinates provided
    if (latitude && longitude) {
      req.body.location = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)], // IMPORTANT: [long, lat]
      };
    }

    // Remove raw lat/long fields so they don't store in DB
    delete req.body.latitude;
    delete req.body.longitude;

    await UserService().updateUsers(id, req.body);

    req.rData = {};

    next();
  };

  /**
   * Notification
   */

  const activateDeactivateNotification = async (req, res, next) => {
    console.log("UserController => activateDeactivateNotification");
    let { userId, notificationAllowed } = req.body;

    let user = await UserService().fetch(userId);

    if (user) {
      if (user.isActive == 0) {
        notificationAllowed = 1;
      } else {
        notificationAllowed = 0;
      }
      let user_data = { notificationAllowed };
      user = await UserService().updateUsers(userId, user_data);
    }

    req.msg = "status_changed";
    next();
  };

  /**
   * Address
   */
  const addUserAddress = async (req, res, next) => {
    console.log("UserController => addUserAddress");

    let { addressId, userId, fullName, address, addressLine1, houseNo, apartment, city, state, pinCode, pincode, zipCode, phone, email, addressType, latitude, longitude } = req.body;

    // Normalize address fields from different mobile app screens
    if (!address) {
      if (houseNo || apartment) {
        address = [houseNo, apartment].filter(Boolean).join(", ");
      } else if (addressLine1) {
        address = addressLine1;
      }
    }

    // Normalize pinCode - mobile app may send as pincode or zipCode
    if (!pinCode && pincode) pinCode = pincode;
    if (!pinCode && zipCode) pinCode = zipCode;

    const addressData = {
      userId,
      fullName,
      address,
      houseNo,
      apartment,
      city,
      state,
      pinCode,
      phone,
      email,
      addressType: addressType || "Home",
    };
    if (latitude !== undefined && longitude !== undefined) {
      addressData.latitude = Number(latitude);
      addressData.longitude = Number(longitude);
    }

    let UserAddress;
    if (addressId) {
      await UserAddressService().updateUserAddress(addressId, addressData);
      UserAddress = await UserAddressService().fetch(addressId);
    } else {
      UserAddress = await UserAddressService().addUserAddress(addressData);
    }

    req.rData = UserAddress;

    req.msg = "success";
    next();
  };

  /**
   * Reverse-geocode a map pin (lat/lng) into address fields, for the
   * "drop a pin" address picker. Best-effort — returns null fields rather
   * than an error if Google Maps isn't configured, so the app can fall
   * back to manual entry.
   */
  const reverseGeocodeAddress = async (req, res, next) => {
    console.log("UserController => reverseGeocodeAddress");
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      req.statusCode = 400;
      throw new Error("latitude and longitude are required");
    }

    const result = await reverseGeocode(Number(latitude), Number(longitude));
    req.rData = result || { formattedAddress: "", city: "", state: "", pincode: "", country: "" };
    req.msg = result ? "success" : "geocoding_unavailable";
    next();
  };

  const getUserAddress = async (req, res, next) => {
    console.log("UserController => getUserAddress");

    let { page, limit, isActive } = req.query;
    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;

    let userId = req.body.userId;
    let query = { userId };

    if (isActive) query.isActive = isActive;

    let UserAddress = await UserAddressService().getUserAddress(
      query,
      page,
      limit
    );

    let total = await UserAddressService().countUserAddress(query);

    req.rData = { page, limit, total, UserAddress, addresses: UserAddress };
    req.msg = "success";
    next();
  };

  const getUserAddressDetail = async (req, res, next) => {
    console.log("UserController => getUserAddressDetail");
    let addressId = req.params.id;
    let UserAddress = await UserAddressService().fetch(addressId);

    req.rData = UserAddress;
    req.msg = "success";
    next();
  };

  const deleteUserAddress = async (req, res, next) => {
    console.log("UserController => deleteUserAddress");
    let addressId = req.params.id;

    await UserAddressService().deleteUserAddress(addressId);

    req.msg = "success";
    next();
  };

  const selectAddress = async (req, res, next) => {
    console.log("UserController => selectAddress");
    let { userId } = req.body;

    const { id } = req.params;

    let query = { userId, _id: { $ne: new ObjectId(id) } };

    let userAddress = await UserAddressService().getUserAddress(
      query,
      null,
      null
    );

    for (const item of userAddress) {
      let { _id } = item;

      await UserAddressService().updateUserAddress(_id, { isSelected: false });
    }

    await UserAddressService().updateUserAddress(id, {
      isSelected: true,
    });

    req.msg = "success";
    next();
  };

  return {
    /**
     * Auth
     */
    updateDeviceToken,
    deleteAccount,
    /**
     * Users
     */
    getAllUserList,
    getDetails,
    editUser,
    /**
     * Address
     */
    addUserAddress,
    reverseGeocodeAddress,
    getUserAddress,
    getUserAddressDetail,
    deleteUserAddress,
    selectAddress,

    /**
     * Notification
     */
    activateDeactivateNotification,
  };
};
