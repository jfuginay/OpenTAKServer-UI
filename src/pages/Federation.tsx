import {
    Badge,
    Button,
    Checkbox,
    FileInput,
    Group,
    Modal,
    NumberInput,
    Pagination,
    PasswordInput,
    Select,
    Stack,
    Table,
    TableData,
    Text,
    Textarea,
    TextInput,
    Title,
    Tooltip,
} from '@mantine/core';
import React, { useEffect, useState } from 'react';
import {
    IconCheck,
    IconCircleMinus,
    IconEdit,
    IconPlus,
    IconRefresh,
    IconToggleLeft,
    IconToggleRight,
    IconUpload,
    IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import axios from '../axios_config';
import { apiRoutes } from '../apiRoutes';

interface Federation {
    id: number;
    name: string;
    address: string;
    port: number;
    protocol: string;
    enabled: boolean;
    has_ca_cert: boolean;
    has_client_cert: boolean;
    has_client_key: boolean;
    username?: string;
    push_data_types: string[];
    connection_status: string;
    last_connected?: string;
    last_error?: string;
    messages_sent: number;
    messages_failed: number;
    notes?: string;
}

const DATA_TYPES = [
    { value: 'cot', label: 'CoT (Cursor on Target)' },
    { value: 'chat', label: 'Chat Messages' },
    { value: 'missions', label: 'Missions' },
    { value: 'datapackages', label: 'Data Packages' },
    { value: 'video', label: 'Video Streams' },
];

export default function FederationPage() {
    const [federations, setFederations] = useState<TableData>({
        caption: '',
        head: ['Name', 'Address', 'Protocol', 'Status', 'Enabled', 'Stats', 'Actions'],
        body: [],
    });
    const [activePage, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [addModalOpened, setAddModalOpened] = useState(false);
    const [editModalOpened, setEditModalOpened] = useState(false);
    const [deleteModalOpened, setDeleteModalOpened] = useState(false);
    const [certModalOpened, setCertModalOpened] = useState(false);

    // Form state
    const [currentFederation, setCurrentFederation] = useState<Federation | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        port: 8089,
        protocol: 'ssl',
        enabled: true,
        username: '',
        password: '',
        notes: '',
        push_data_types: ['cot'],
    });

    // Certificate upload
    const [certType, setCertType] = useState<string>('ca');
    const [certFile, setCertFile] = useState<File | null>(null);

    useEffect(() => {
        getFederations();
    }, [activePage]);

    function getFederations() {
        axios
            .get(apiRoutes.federations, { params: { page: activePage } })
            .then((r) => {
                if (r.status === 200) {
                    const tableData: TableData = {
                        caption: '',
                        head: ['Name', 'Address', 'Protocol', 'Status', 'Enabled', 'Stats', 'Actions'],
                        body: [],
                    };

                    r.data.results.forEach((fed: Federation) => {
                        const statusColor =
                            fed.connection_status === 'connected'
                                ? 'green'
                                : fed.connection_status === 'error'
                                ? 'red'
                                : 'gray';

                        const row = [
                            <Text key={`${fed.id}_name`}>{fed.name}</Text>,
                            <Text key={`${fed.id}_addr`}>
                                {fed.address}:{fed.port}
                            </Text>,
                            <Badge key={`${fed.id}_protocol`} color={fed.protocol === 'ssl' ? 'blue' : 'gray'}>
                                {fed.protocol.toUpperCase()}
                            </Badge>,
                            <Tooltip
                              key={`${fed.id}_status`}
                              label={fed.last_error || 'No recent connection'}
                            >
                                <Badge color={statusColor}>{fed.connection_status}</Badge>
                            </Tooltip>,
                            <Badge key={`${fed.id}_enabled`} color={fed.enabled ? 'green' : 'red'}>
                                {fed.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>,
                            <Text key={`${fed.id}_stats`} size="sm">
                                Sent: {fed.messages_sent} | Failed: {fed.messages_failed}
                            </Text>,
                            <Group key={`${fed.id}_actions`}>
                                <Tooltip label="Edit">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      onClick={() => handleEdit(fed)}
                                    >
                                        <IconEdit size={16} />
                                    </Button>
                                </Tooltip>
                                <Tooltip label="Upload Certificates">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      color="blue"
                                      onClick={() => {
                                            setCurrentFederation(fed);
                                            setCertModalOpened(true);
                                        }}
                                    >
                                        <IconUpload size={16} />
                                    </Button>
                                </Tooltip>
                                <Tooltip label={fed.enabled ? 'Disable' : 'Enable'}>
                                    <Button
                                      size="xs"
                                      variant="light"
                                      color={fed.enabled ? 'orange' : 'green'}
                                      onClick={() => handleToggle(fed.id)}
                                    >
                                        {fed.enabled ? <IconToggleRight size={16} /> : <IconToggleLeft size={16} />}
                                    </Button>
                                </Tooltip>
                                <Tooltip label="Delete">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      color="red"
                                      onClick={() => {
                                            setCurrentFederation(fed);
                                            setDeleteModalOpened(true);
                                        }}
                                    >
                                        <IconCircleMinus size={16} />
                                    </Button>
                                </Tooltip>
                            </Group>,
                        ];

                        if (tableData.body !== undefined) {
                            tableData.body.push(row);
                        }
                    });

                    setFederations(tableData);
                    setTotalPages(r.data.num_pages);
                }
            })
            .catch((err) => {
                console.error(err);
                notifications.show({
                    title: 'Error',
                    message: err.response?.data?.error || 'Failed to load federations',
                    color: 'red',
                });
            });
    }

    function handleAdd() {
        axios
            .post(apiRoutes.federations, formData)
            .then((r) => {
                if (r.status === 201) {
                    notifications.show({
                        message: 'Federation created successfully',
                        color: 'green',
                    });
                    setAddModalOpened(false);
                    resetForm();
                    getFederations();
                }
            })
            .catch((err) => {
                notifications.show({
                    title: 'Error',
                    message: err.response?.data?.error || 'Failed to create federation',
                    color: 'red',
                });
            });
    }

    function handleEdit(federation: Federation) {
        setCurrentFederation(federation);
        setFormData({
            name: federation.name,
            address: federation.address,
            port: federation.port,
            protocol: federation.protocol,
            enabled: federation.enabled,
            username: federation.username || '',
            password: '',
            notes: federation.notes || '',
            push_data_types: federation.push_data_types,
        });
        setEditModalOpened(true);
    }

    function handleUpdate() {
        if (!currentFederation) return;

        axios
            .put(`${apiRoutes.federations}/${currentFederation.id}`, formData)
            .then((r) => {
                if (r.status === 200) {
                    notifications.show({
                        message: 'Federation updated successfully',
                        color: 'green',
                    });
                    setEditModalOpened(false);
                    setCurrentFederation(null);
                    resetForm();
                    getFederations();
                }
            })
            .catch((err) => {
                notifications.show({
                    title: 'Error',
                    message: err.response?.data?.error || 'Failed to update federation',
                    color: 'red',
                });
            });
    }

    function handleDelete() {
        if (!currentFederation) return;

        axios
            .delete(`${apiRoutes.federations}/${currentFederation.id}`)
            .then((r) => {
                if (r.status === 200) {
                    notifications.show({
                        message: 'Federation deleted successfully',
                        color: 'green',
                    });
                    setDeleteModalOpened(false);
                    setCurrentFederation(null);
                    getFederations();
                }
            })
            .catch((err) => {
                notifications.show({
                    title: 'Error',
                    message: err.response?.data?.error || 'Failed to delete federation',
                    color: 'red',
                });
            });
    }

    function handleToggle(federationId: number) {
        axios
            .post(`${apiRoutes.federations}/${federationId}/toggle`)
            .then((r) => {
                if (r.status === 200) {
                    notifications.show({
                        message: r.data.enabled ? 'Federation enabled' : 'Federation disabled',
                        color: 'green',
                    });
                    getFederations();
                }
            })
            .catch((err) => {
                notifications.show({
                    title: 'Error',
                    message: err.response?.data?.error || 'Failed to toggle federation',
                    color: 'red',
                });
            });
    }

    function handleCertUpload() {
        if (!currentFederation || !certFile) {
            notifications.show({
                message: 'Please select a file',
                color: 'red',
            });
            return;
        }

        const formData = new FormData();
        formData.append('file', certFile);
        formData.append('cert_type', certType);

        axios
            .post(`${apiRoutes.federations}/${currentFederation.id}/upload_cert`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((r) => {
                if (r.status === 200) {
                    notifications.show({
                        message: 'Certificate uploaded successfully',
                        color: 'green',
                    });
                    setCertFile(null);
                    setCertModalOpened(false);
                    getFederations();
                }
            })
            .catch((err) => {
                notifications.show({
                    title: 'Error',
                    message: err.response?.data?.error || 'Failed to upload certificate',
                    color: 'red',
                });
            });
    }

    function resetForm() {
        setFormData({
            name: '',
            address: '',
            port: 8089,
            protocol: 'ssl',
            enabled: true,
            username: '',
            password: '',
            notes: '',
            push_data_types: ['cot'],
        });
    }

    function renderFormFields() {
        return (
            <Stack>
                <TextInput
                  label="Name"
                  placeholder="My Federation Server"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
                />
                <TextInput
                  label="Address"
                  placeholder="tak.example.com"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.currentTarget.value })}
                />
                <NumberInput
                  label="Port"
                  required
                  value={formData.port}
                  onChange={(val) => setFormData({ ...formData, port: Number(val) })}
                />
                <Select
                  label="Protocol"
                  required
                  data={[
                        { value: 'tcp', label: 'TCP' },
                        { value: 'ssl', label: 'SSL/TLS' },
                    ]}
                  value={formData.protocol}
                  onChange={(val) => setFormData({ ...formData, protocol: val || 'ssl' })}
                />
                <TextInput
                  label="Username (optional)"
                  placeholder="federation_user"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.currentTarget.value })}
                />
                <PasswordInput
                  label="Password (optional)"
                  placeholder="Leave blank to keep current password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.currentTarget.value })}
                />
                <div>
                    <Text size="sm" fw={500} mb="xs">
                        Data Types to Push
                    </Text>
                    {DATA_TYPES.map((type) => (
                        <Checkbox
                          key={type.value}
                          label={type.label}
                          checked={formData.push_data_types.includes(type.value)}
                          onChange={(e) => {
                                if (e.currentTarget.checked) {
                                    setFormData({
                                        ...formData,
                                        push_data_types: [...formData.push_data_types, type.value],
                                    });
                                } else {
                                    setFormData({
                                        ...formData,
                                        push_data_types: formData.push_data_types.filter((t) => t !== type.value),
                                    });
                                }
                            }}
                        />
                    ))}
                </div>
                <Textarea
                  label="Notes (optional)"
                  placeholder="Additional information about this federation"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.currentTarget.value })}
                />
                <Checkbox
                  label="Enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.currentTarget.checked })}
                />
            </Stack>
        );
    }

    return (
        <>
            <Group mb="md">
                <Title order={2}>Federation Management</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpened(true)}>
                    Add Federation
                </Button>
                <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={getFederations}>
                    Refresh
                </Button>
            </Group>

            <Table data={federations} />

            <Pagination value={activePage} onChange={setPage} total={totalPages} mt="md" />

            {/* Add Modal */}
            <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Add Federation Server" size="lg">
                {renderFormFields()}
                <Group mt="md">
                    <Button onClick={handleAdd} leftSection={<IconCheck size={16} />}>
                        Create
                    </Button>
                    <Button variant="light" onClick={() => setAddModalOpened(false)} leftSection={<IconX size={16} />}>
                        Cancel
                    </Button>
                </Group>
            </Modal>

            {/* Edit Modal */}
            <Modal opened={editModalOpened} onClose={() => setEditModalOpened(false)} title="Edit Federation Server" size="lg">
                {renderFormFields()}
                <Group mt="md">
                    <Button onClick={handleUpdate} leftSection={<IconCheck size={16} />}>
                        Update
                    </Button>
                    <Button variant="light" onClick={() => setEditModalOpened(false)} leftSection={<IconX size={16} />}>
                        Cancel
                    </Button>
                </Group>
            </Modal>

            {/* Delete Modal */}
            <Modal opened={deleteModalOpened} onClose={() => setDeleteModalOpened(false)} title="Delete Federation">
                <Text>
                    Are you sure you want to delete the federation "{currentFederation?.name}"? This action cannot be undone.
                </Text>
                <Group mt="md">
                    <Button color="red" onClick={handleDelete} leftSection={<IconCheck size={16} />}>
                        Delete
                    </Button>
                    <Button variant="light" onClick={() => setDeleteModalOpened(false)} leftSection={<IconX size={16} />}>
                        Cancel
                    </Button>
                </Group>
            </Modal>

            {/* Certificate Upload Modal */}
            <Modal opened={certModalOpened} onClose={() => setCertModalOpened(false)} title="Upload SSL Certificates">
                <Stack>
                    <Text size="sm">Upload SSL certificates for {currentFederation?.name}</Text>
                    <Select
                      label="Certificate Type"
                      required
                      data={[
                            { value: 'ca', label: 'CA Certificate' },
                            { value: 'client_cert', label: 'Client Certificate' },
                            { value: 'client_key', label: 'Client Private Key' },
                        ]}
                      value={certType}
                      onChange={(val) => setCertType(val || 'ca')}
                    />
                    <FileInput
                      label="Certificate File"
                      placeholder="Select .pem, .crt, .key, or .pfx file"
                      accept=".pem,.crt,.key,.cer,.p12,.pfx"
                      value={certFile}
                      onChange={setCertFile}
                    />
                    <Group>
                        <Button onClick={handleCertUpload} leftSection={<IconUpload size={16} />}>
                            Upload
                        </Button>
                        <Button variant="light" onClick={() => setCertModalOpened(false)} leftSection={<IconX size={16} />}>
                            Cancel
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
