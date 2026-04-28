import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/solid";

export interface Option {
  value: string;
  label: string;
}

export default function Dropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string;
  onChange: (value: string) => void;
}) {
  const selectedLabel = options.find((opt) => opt.value === selected)?.label || "";

  return (
    <div className="relative w-full min-w-[180px]">
      <Listbox value={selected ?? ""} onChange={onChange}>
        <div className="relative">
          {/* 🔹 Main button */}
          <Listbox.Button
            className="relative w-full cursor-pointer rounded-lg bg-white py-2.5 pl-4 pr-10 text-left 
                       border border-gray-300 text-gray-700 font-medium shadow-sm
                       focus:ring-2 focus:ring-orange-400 focus:border-orange-400
                       transition-all duration-300 hover:border-orange-400/40 hover:shadow-md"
          >
            <span className="block truncate">
              {selectedLabel || `Seleccione ${label.toLowerCase()}`}
            </span>

            {/* 🔸 Dropdown arrow */}
            <ChevronDownIcon
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </Listbox.Button>

          {/* 🔽 Dropdown options */}
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 -translate-y-1 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 -translate-y-1 scale-95"
          >
            <Listbox.Options
              className="absolute mt-2 w-full rounded-lg bg-white border border-gray-200 shadow-lg 
                         max-h-60 overflow-auto focus:outline-none z-20"
            >
              {options.map((opt, idx) => (
                <Listbox.Option
                  key={`${opt.value}-${idx}`}
                  value={opt.value}
                  className={({ active }) =>
                    `cursor-pointer select-none px-4 py-2 text-sm flex justify-between items-center rounded-md transition-colors duration-150 ${
                      active
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span>{opt.label}</span>
                      {selected && (
                        <CheckIcon
                          className="h-4 w-4 text-orange-500 transition-transform duration-200"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
