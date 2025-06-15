"use client";

import { FC, useEffect, useState } from "react";
import Image from "next/image";
import { Button, InputWithLabel } from "@/components";
import { User, UserResponse } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { createUser, getUser, updateUser } from "@/actions";

type Mode = "view" | "edit" | "create";

const USER_ID_KEY = "currentUserId";

export const UserProfile: FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(
    (searchParams.get("mode") as Mode) || "view"
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<Partial<UserResponse>>({});
  const [formData, setFormData] = useState<Partial<User>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const user = await getUser(userId);
        setUserData(user);
        setFormData({
          fullname: user.fullname,
          companyname: user.companyname,
          position: user.position,
          phone: user.phone,
          email: user.email,
          hobby: user.hobby,
        });
      } catch (err) {
        setError("Failed to fetch user data");
        console.error("Fetch user error:", err);

        localStorage.removeItem(USER_ID_KEY);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "view") {
      params.delete("mode");
    } else {
      params.set("mode", mode);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [mode, searchParams, router]);

  const handleModeChange = (newMode: Mode) => {
    const updatedMode = mode === newMode ? "view" : newMode;
    setMode(updatedMode);

    if (updatedMode === "edit") {
      setFormData({
        fullname: userData.fullname,
        companyname: userData.companyname,
        position: userData.position,
        phone: userData.phone,
        email: userData.email,
        hobby: userData.hobby,
      });
    } else if (updatedMode === "create") {
      setFormData({});
    }
  };

  const handleInputChange = (field: keyof User, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === "edit" && userId) {
        const updatedUser = await updateUser(userId, formData);
        setUserData(updatedUser);
      } else if (mode === "create") {
        const newUser = await createUser(formData as UserResponse);
        setUserData(newUser);
        localStorage.setItem(USER_ID_KEY, newUser.id);
        setUserId(newUser.id);
      }
      setMode("view");
    } catch (err) {
      setError(
        mode === "edit" ? "Failed to update user" : "Failed to create user"
      );
      console.error("Submit error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setMode("view");
  };

  if (isLoading && mode === "view" && userId) {
    return <div className="text-center p-8">Loading user data...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button
          onClick={() => {
            setError(null);
            if (!userId) handleModeChange("create");
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          {userId ? "Try Again" : "Create New Profile"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 shadow-md rounded-md mt-10">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative w-52 h-52 rounded-lg overflow-hidden border-2 border-blue-500 shrink-0 mt-24">
          <Image
            src={userData.avatar || "/default-avatar.png"}
            alt="User Avatar"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {mode === "create" ? "Create Profile" : "User Profile"}
            </h2>
            <div className="flex items-center gap-4">
              {userId && (
                <Button
                  onClick={() => handleModeChange("edit")}
                  className="text-blue-600 hover:underline cursor-pointer"
                  disabled={mode === "create" || isLoading}
                >
                  {mode === "edit" ? "Cancel" : "Edit"}
                </Button>
              )}
              <Button
                onClick={() => handleModeChange("create")}
                className="text-blue-600 hover:underline cursor-pointer"
                disabled={(mode === "edit" || !!userId) && mode !== "create"}
              >
                {mode === "create" ? "Cancel" : "Create"}
              </Button>
            </div>
          </div>

          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            onSubmit={handleSubmit}
          >
            <InputWithLabel
              label="Full Name"
              placeholder="John Doe"
              disabled={mode === "view" || isLoading}
              value={formData.fullname || ""}
              onChange={(e) => handleInputChange("fullname", e.target.value)}
              required={mode !== "view"}
            />
            <InputWithLabel
              label="Company Name"
              placeholder="ACME Corp."
              disabled={mode === "view" || isLoading}
              value={formData.companyname || ""}
              onChange={(e) => handleInputChange("companyname", e.target.value)}
            />
            <InputWithLabel
              label="Position"
              placeholder="Software Engineer"
              disabled={mode === "view" || isLoading}
              value={formData.position || ""}
              onChange={(e) => handleInputChange("position", e.target.value)}
            />
            <InputWithLabel
              label="Phone Number"
              placeholder="+1 234 567 8901"
              disabled={mode === "view" || isLoading}
              value={formData.phone || ""}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
            <InputWithLabel
              label="Email"
              placeholder="john@example.com"
              disabled={mode === "view" || isLoading}
              value={formData.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required={mode !== "view"}
              type="email"
            />
            <InputWithLabel
              label="Hobby"
              placeholder="Photography, Hiking..."
              disabled={mode === "view" || isLoading}
              value={formData.hobby || ""}
              onChange={(e) => handleInputChange("hobby", e.target.value)}
            />

            {(mode === "edit" || mode === "create") && (
              <div className="flex justify-end gap-4 mt-6 col-span-full">
                <Button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Processing..."
                    : mode === "edit"
                    ? "Save Changes"
                    : "Create Profile"}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
