import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDeviceDetail } from '../features/devices/hooks/useDeviceDetail';
import { DeviceDetailHeader } from '../features/devices/components/DeviceDetailHeader';
import { DevicePegawaiTable } from '../features/devices/components/DevicePegawaiTable';
import {
  UpdateUserModal,
  EnrollFingerprintModal,
} from '../features/devices/components/modals/DeviceModals';

export default function DeviceDetail() {
  const { sn } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('devices:write');
  const canManageFingerprint = hasPermission('fingerprint:manage');

  const dev = useDeviceDetail(sn);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Info (read-only: status, last activity, IP, pegawai count) */}
      <DeviceDetailHeader
        device={dev.device}
        sn={sn}
        pegawaiCount={dev.pegawaiCount}
        onBack={() => navigate('/devices')}
      />

      {/* Pegawai List Table */}
      <DevicePegawaiTable
        pegawai={dev.pegawai}
        totalCount={dev.totalCount}
        loading={dev.loading}
        search={dev.search}
        setSearch={dev.setSearch}
        page={dev.page}
        setPage={dev.setPage}
        limit={dev.limit}
        onOpenUpdateUser={(user) => dev.setUpdateUserModal({ open: true, data: user })}
        onOpenEnroll={(user) => dev.setEnrollModal({ open: true, data: user })}
        onDeleteUser={dev.removeUserFromDevice}
        canWrite={canWrite}
        canManageFingerprint={canManageFingerprint}
      />

      {/* Modals */}
      <UpdateUserModal
        open={dev.updateUserModal.open}
        onClose={() => dev.setUpdateUserModal({ open: false, data: null })}
        onSubmit={dev.submitUpdateUser}
        targetUser={dev.updateUserModal.data}
      />

      <EnrollFingerprintModal
        open={dev.enrollModal.open}
        onClose={() => dev.setEnrollModal({ open: false, data: null })}
        onSubmit={dev.submitEnrollFingerprint}
        targetUser={dev.enrollModal.data}
      />
    </div>
  );
}
