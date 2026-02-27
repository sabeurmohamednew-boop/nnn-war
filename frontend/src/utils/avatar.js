export const getAvatarUrl = (username, avatarUrl) => {
  if (avatarUrl) {
    return `${process.env.REACT_APP_BACKEND_URL}${avatarUrl}`;
  }
  // Use DiceBear API with username as seed
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;
};
