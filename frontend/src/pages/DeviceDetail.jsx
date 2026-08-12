import { useParams, useNavigate } from 'react';
import { useDeviceDetail } from '../features/devices/hooks/useDeviceDetail';
import { DeviceDetailHeader } from '../features/devices/components/DeviceDetailHeader';
import { DevicePegawaiTable } from '../features/devices/components/DevicePegawaiTable';
import {
  EditDeviceNameModal,
  UpdateUserModal,
  EnrollFingerprintModal,
} from '../features/devices/components/modals/DeviceModals';

export default function DeviceDetail() {
  const { sn } = useParams();
  const navigate = useNavigate();

  const dev = useDeviceDetail(sn);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Info & Actions */}
      <DeviceDetailHeader
        device={dev.device}
        sn={sn}
        onBack={() => navigate('/devices')}
        onEditName={() => dev.setEditNameModal(true)}
        onVerify={dev.verify}
        onUnverify={dev.unverify}
        onReupload={dev.reupload}
        onReboot={dev.reboot}
        onClearLog={dev.clearLog}
        onRequestInfo={dev.requestInfo}
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
      />

      {/* Modals */}
      <EditDeviceNameModal
        open={dev.editNameModal}
        onClose={() => dev.setEditNameModal(false)}
        onSubmit={dev.submitDeviceName}
        currentName={dev.device?.device_name}
      />

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
