import React, { useState, useEffect } from "react";
import Button from "./Button";
import Input from "./Input";
import {
  ClockIcon,
  FingerPrintIcon,
  UserIcon,
  HomeIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
} from "./icons/index";
import { formatTime } from "../../utils/formatters";
import { SupplierEntry } from "../../types";
import TimePickerDialog from "./TimePickerDialog";

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<SupplierEntry, "id" | "timestamp">) => Promise<void>;
  initialData?: SupplierEntry | null;
  isEditing: boolean;
}

import CinematicModal from "./CinematicModal";

const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}) => {
  const [data, setData] = useState({
    licensePlate: "",
    driverName: "",
    paxCount: 0,
    company: "",
    reason: "",
    time: "",
  });
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setData({
          licensePlate: initialData.licensePlate,
          driverName: initialData.driverName,
          paxCount: initialData.paxCount,
          company: initialData.company,
          reason: initialData.reason,
          time: initialData.time,
        });
      } else {
        setData({
          licensePlate: "",
          driverName: "",
          paxCount: 0,
          company: "",
          reason: "",
          time: formatTime(new Date()),
        });
      }
    }
  }, [isOpen, initialData]);

  const handleLicensePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length > 6) value = value.substring(0, 6);
    let formattedValue = "";
    if (value.length > 0) formattedValue = value.substring(0, Math.min(2, value.length));
    if (value.length > 2) formattedValue += "-" + value.substring(2, Math.min(4, value.length));
    if (value.length > 4) formattedValue += "-" + value.substring(4, Math.min(6, value.length));
    setData((s) => ({ ...s, licensePlate: formattedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.time || !data.licensePlate || !data.driverName || !data.company || !data.reason) {
      return;
    }
    onSave(data);
  };

  const handleClockClick = () => {
    setIsTimePickerOpen(true);
  };

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/20">
            <UsersIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white tracking-tight uppercase italic leading-none">
              {isEditing ? "Editar Proveedor" : "Ingreso de Proveedor"}
            </h3>
            <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic leading-none">
              Control de Acceso Vehicular
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4 italic">
              Hora del Ingreso
            </label>
            <div className="relative group cursor-pointer" onClick={handleClockClick}>
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500 z-10 pointer-events-none">
                <ClockIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-950/40 border border-black/15 dark:border-white/5 p-1 transition-all group-hover:border-emerald-500/30 shadow-inner">
                <div className="w-full h-20 pl-16 pr-8 bg-transparent text-4xl font-mono font-black text-gray-950 dark:text-emerald-400 outline-none relative z-10 flex items-center select-none pointer-events-none">
                  {data.time}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4 italic">
              Patente Vehicular
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none">
                <FingerPrintIcon className="w-5 h-5" />
              </div>
              <Input
                value={data.licensePlate}
                onChange={handleLicensePlateChange}
                placeholder="AA-BB-11"
                className="!pl-12 !bg-white dark:!bg-gray-800/50 !rounded-2xl !h-20 !font-black !tracking-[0.2em] !text-2xl !text-gray-950 dark:!text-white shadow-inner uppercase italic border-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4 italic">
            Conductor / Responsable
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <Input
              value={data.driverName}
              onChange={(e) => setData((s) => ({ ...s, driverName: e.target.value }))}
              placeholder="Nombre completo del conductor"
              className="!pl-12 !bg-white dark:!bg-gray-800/50 !rounded-2xl !h-12 !text-gray-950 dark:!text-white font-bold italic border-none shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4 italic">
              Empresa / Entidad
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <HomeIcon className="w-5 h-5" />
              </div>
              <Input
                value={data.company}
                onChange={(e) => setData((s) => ({ ...s, company: e.target.value }))}
                placeholder="Nombre de la empresa"
                className="!pl-12 !bg-white dark:!bg-gray-800/50 !rounded-2xl !h-12 !text-gray-950 dark:!text-white font-bold italic border-none shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4 italic">
              Pasajeros Extra
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <UsersIcon className="w-5 h-5" />
              </div>
              <Input
                type="number"
                min="0"
                value={data.paxCount || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setData((s) => ({ ...s, paxCount: val === "" ? 0 : parseInt(val, 10) }));
                }}
                onFocus={(e) => e.target.select()}
                className="!pl-12 !bg-white dark:!bg-gray-800/50 !rounded-2xl !h-12 !text-gray-950 dark:!text-white font-black italic border-none shadow-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4 italic">
            Motivo del Ingreso
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-6 text-gray-400">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </div>
            <textarea
              value={data.reason}
              onChange={(e) => setData((s) => ({ ...s, reason: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (
                    data.time &&
                    data.licensePlate &&
                    data.driverName &&
                    data.company &&
                    data.reason
                  ) {
                    onSave(data);
                  }
                }
              }}
              placeholder="Escriba aquí el motivo del ingreso..."
              className="w-full pl-12 pr-6 py-4 text-base text-gray-950 dark:text-gray-200 bg-white dark:bg-gray-800/50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none resize-none h-28 font-bold leading-relaxed shadow-sm italic"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="rounded-xl px-6 font-bold h-11"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              !data.time || !data.licensePlate || !data.driverName || !data.company || !data.reason
            }
            className="bg-emerald-500 !text-white px-8 h-11 rounded-xl font-black uppercase text-[11px] tracking-[0.15em] border-none shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            {isEditing ? "Actualizar Registro" : "Guardar Registro"}
          </Button>
        </div>
      </form>

      <TimePickerDialog
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        onSave={(newTime) => setData((s) => ({ ...s, time: newTime }))}
        initialTime={data.time}
        accentColor="emerald"
      />
    </CinematicModal>
  );
};

export default AddSupplierModal;
