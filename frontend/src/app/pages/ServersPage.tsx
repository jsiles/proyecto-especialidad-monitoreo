import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  Server, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  X
} from "lucide-react";
import { useServers } from "../../hooks/useServers";
import { type CreateServerData, type UpdateServerData } from "../../services/serversService";
import { getErrorMessage } from "../../services/api";

export function ServersPage() {
  const { 
    servers, 
    loading, 
    error: serverError,
    createServer, 
    updateServer, 
    deleteServer,
    refreshServers
  } = useServers(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateServerData>({
    name: "",
    ip_address: "",
    type: "application",
    environment: "production",
  });

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleOpenForm = (server?: typeof servers[0]) => {
    if (server) {
      setEditingId(server.id);
      setFormData({
        name: server.name,
        ip_address: server.ip_address || "",
        type: server.type || "application",
        environment: server.environment || "production",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        ip_address: "",
        type: "application",
        environment: "production",
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      ip_address: "",
      type: "application",
      environment: "production",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingId) {
        await updateServer(editingId, formData as UpdateServerData);
        setSuccess("Server updated successfully!");
      } else {
        await createServer(formData);
        setSuccess("Server created successfully!");
      }
      handleCloseForm();
      refreshServers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete server "${name}"?`)) return;

    try {
      await deleteServer(id);
      setSuccess("Server deleted successfully!");
      refreshServers();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-red-500";
      case "degraded":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-gray-700">Servers Management</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => refreshServers()}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => handleOpenForm()}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {(error || serverError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error || serverError}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-700">
                  {editingId ? "Edit Server" : "Add New Server"}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Server Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., srv-app-01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Address *
                    </label>
                    <Input
                      type="text"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                      placeholder="e.g., 192.168.1.100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as CreateServerData['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="application">Application</option>
                      <option value="database">Database</option>
                      <option value="web">Web Server</option>
                      <option value="cache">Cache Server</option>
                      <option value="queue">Queue Server</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Environment *
                    </label>
                    <select
                      value={formData.environment}
                      onChange={(e) => setFormData({ ...formData, environment: e.target.value as CreateServerData['environment'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                      <option value="testing">Testing</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-500">
                      La descripción no está soportada todavía por el API de servidores actual.
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    onClick={handleCloseForm}
                    variant="outline"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                  >
                    {submitting ? "Saving..." : editingId ? "Update Server" : "Create Server"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Servers List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading && servers.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6]"></div>
          </div>
        ) : servers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Environment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {servers.map((server) => (
                  <tr key={server.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)}`} />
                        <span className="text-xs text-gray-500 capitalize">
                          {server.status || 'unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{server.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {server.ip_address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 capitalize">
                        {server.type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded capitalize ${
                        server.environment === 'production' 
                          ? 'bg-red-100 text-red-800'
                          : server.environment === 'staging'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {server.environment || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleOpenForm(server)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(server.id, server.name)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Server className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No servers configured</p>
            <p className="text-sm mt-2">Add your first server using the button above</p>
          </div>
        )}
      </div>
    </div>
  );
}
