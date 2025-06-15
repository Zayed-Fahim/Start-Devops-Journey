export type User = {
  fullname: string;
  companyname: string;
  position: string;
  phone: string;
  email: string;
  avatar: string;
  hobby: string;
};

export interface UserResponse extends User {
  id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
