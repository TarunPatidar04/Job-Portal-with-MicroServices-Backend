import { AuthenticatedRequest } from "../middleware/auth.js";
import { TryCatch } from "../utils/TryCatch.js";

export const myProfile = TryCatch(
  async (req: AuthenticatedRequest, res, next) => {
    const user = req.user;

    res.status(200).json({
      success: true,
      user,
    });
  },
);
