"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Plus, Shield, Pencil, Trash2 } from "lucide-react";

interface User {
  id: number;
  username: string;
  role: string;
  displayName: string;
  isActive: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function UserManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "editor",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session) fetchUsers();
  }, [session]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditUser(null);
    setForm({ username: "", password: "", displayName: "", role: "editor" });
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditUser(user);
    setForm({
      username: user.username,
      password: "",
      displayName: user.displayName,
      role: user.role,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      showToast("请输入显示名称", "error");
      return;
    }
    if (!editUser && !form.password.trim()) {
      showToast("请输入密码", "error");
      return;
    }

    setSaving(true);
    try {
      if (editUser) {
        const body: any = {
          role: form.role,
          displayName: form.displayName,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/users/${editUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("用户已更新", "success");
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("用户已创建", "success");
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (e: any) {
      showToast(e.message || "操作失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`确定要删除用户"${user.displayName}"吗？`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("用户已删除（停用）", "success");
      fetchUsers();
    } catch (e: any) {
      showToast(e.message || "操作失败", "error");
    }
  };

  const roleLabels: Record<string, string> = {
    admin: "管理员",
    editor: "编辑者",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    editor: "bg-blue-100 text-blue-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统用户及权限</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus size={18} className="mr-1" />
          添加用户
        </Button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  用户名
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  显示名称
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  角色
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  状态
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  创建时间
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  上次登录
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {user.displayName}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[user.role]}`}
                    >
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.isActive ? "正常" : "已停用"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.createdAt?.slice(0, 10)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastLoginAt?.slice(0, 16) || "从未登录"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>
            {editUser ? "编辑用户" : "新增用户"}
          </DialogTitle>
          <DialogClose onClick={() => setDialogOpen(false)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {!editUser && (
              <div>
                <Label>用户名</Label>
                <Input
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  placeholder="登录用户名"
                />
              </div>
            )}
            {editUser && (
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                用户名：{editUser.username}
              </div>
            )}
            <div>
              <Label>密码{editUser ? "（留空则不修改）" : ""}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder={editUser ? "留空则保持原密码" : "设置密码"}
              />
            </div>
            <div>
              <Label>显示名称</Label>
              <Input
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
                placeholder="用户显示名称"
              />
            </div>
            <div>
              <Label>角色</Label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="editor">编辑者 (查看+修改)</option>
                <option value="admin">管理员 (全部权限)</option>
              </select>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
