import { customAxios } from "@/actions";
import { User, UserResponse } from "@/types";

export const getUser = async (userId: string): Promise<User> => {
  try {
    const response = await customAxios.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createUser = async (data: UserResponse): Promise<UserResponse> => {
  try {
    const response = await customAxios.post("/users", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (
  id: string,
  data: Partial<User>
): Promise<User> => {
  try {
    const response = await customAxios.patch(`/users/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
