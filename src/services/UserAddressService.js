const UserAddress = require("../models/UserAddress");

module.exports = () => {
  const addUserAddress = (data) => {
    return new Promise(function (resolve, reject) {
      UserAddress.create(data).then(resolve).catch(reject);
    });
  };

  const fetch = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = UserAddress.findById(id).select(" -time -__v");
      orm.then(resolve).catch(reject);
    });
  };

  const fetchByQuery = (query) => {
    console.log("UserAddressService => fetchByQuery");
    return new Promise(function (resolve, reject) {
      let orm = UserAddress.findOne(query).select("").sort({ _id: -1 });
      orm.then(resolve).catch(reject);
    });
  };

  const fetchByQueryForCart = (query) => {
    console.log("UserAddressService => fetchByQueryForCart");
    return new Promise(function (resolve, reject) {
      let orm = UserAddress.findOne(query)
        .select("-userId -__v -isActive")
        .sort({ _id: -1 });
      orm.then(resolve).catch(reject);
    });
  };

  const updateUserAddress = (UserAddressId, data) => {
    console.log("UserAddressService => resetPassword");
    return new Promise(async function (resolve, reject) {
      let Banner = await UserAddress.findByIdAndUpdate(
        { _id: UserAddressId },
        data
      )
        .then(resolve)
        .catch(reject);
    });
  };

  const fetchByQueryToEdit = (query) => {
    console.log("UserAddressService => fetchByQuery");
    return new Promise(function (resolve, reject) {
      let orm = UserAddress.findOne(query).select("");

      orm.then(resolve).catch(reject);
    });
  };

  const getUserAddress = (query, page, limit) => {
    return new Promise(function (resolve, reject) {
      let orm = UserAddress.find(query)
        .select(" -__v")
        .sort({ _id: -1 })
        // .skip(page * limit)
        .limit(limit);
      orm.then(resolve).catch(reject);
    });
  };

  const countUserAddress = (query) => {
    return new Promise(function (resolve, reject) {
      let orm = UserAddress.countDocuments(query);
      orm.then(resolve).catch(reject);
    });
  };

  const deleteUserAddress = (id) => {
    return new Promise(function (resolve, reject) {
      let orm = UserAddress.deleteOne({ _id: id });
      orm.then(resolve).catch(reject);
    });
  };

  return {
    addUserAddress,
    fetch,
    fetchByQuery,
    fetchByQueryToEdit,
    updateUserAddress,
    getUserAddress,
    countUserAddress,
    fetchByQueryForCart,
    deleteUserAddress,
  };
};
