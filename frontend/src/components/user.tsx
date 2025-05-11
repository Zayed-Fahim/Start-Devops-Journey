"use client";

import { FC, useState } from "react";
import Image from "next/image";
import { Button, InputWithLabel } from "@/components";

export const UserProfile: FC = () => {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 shadow-md rounded-md mt-10">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative w-52 h-52 rounded-lg overflow-hidden border-2 border-blue-500 shrink-0 mt-24">
          <Image
            src="/default-avatar.png"
            alt="User Avatar"
            fill
            className="object-cover"
          />
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">User Profile</h2>
            <Button
              onClick={handleEditToggle}
              className="text-blue-600 hover:underline"
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputWithLabel
              label="Full Name"
              placeholder="John Doe"
              disabled={!isEditing}
            />
            <InputWithLabel
              label="Company Name"
              placeholder="ACME Corp."
              disabled={!isEditing}
            />
            <InputWithLabel
              label="Position"
              placeholder="Software Engineer"
              disabled={!isEditing}
            />
            <InputWithLabel
              label="Phone Number"
              placeholder="+1 234 567 8901"
              disabled={!isEditing}
            />
            <InputWithLabel
              label="Email"
              placeholder="john@example.com"
              disabled={!isEditing}
            />
            <InputWithLabel
              label="Hobby"
              placeholder="Photography, Hiking..."
              disabled={!isEditing}
            />
          </div>

          {isEditing && (
            <div className="flex justify-end mt-6">
              <Button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition">
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
