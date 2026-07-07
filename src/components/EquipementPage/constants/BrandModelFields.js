import React from "react";
import { buildBrandOptions, buildModelOptions } from "./equipmentCatalog";

/**
 * Champs Marque / Modèle en listes déroulantes bornées.
 * @param {Object} props
 * @param {Record<string, string[]>} props.catalog
 * @param {string} props.manufacturer
 * @param {string} props.model
 * @param {(value: string) => void} props.onManufacturerChange
 * @param {(value: string) => void} props.onModelChange
 * @param {string} [props.manufacturerId]
 * @param {string} [props.modelId]
 * @param {string} [props.fieldClassName]
 * @param {string} [props.labelClassName]
 * @param {string} [props.inputClassName]
 * @param {Object} [props.fieldStyle]
 * @param {Object} [props.inputStyle]
 */
export default function BrandModelFields({
  catalog,
  manufacturer,
  model,
  onManufacturerChange,
  onModelChange,
  manufacturerId = "equipment-manufacturer",
  modelId = "equipment-model",
  fieldClassName,
  labelClassName,
  inputClassName,
  fieldStyle,
  inputStyle,
  labelStyle,
}) {
  const brandOptions = buildBrandOptions(catalog, manufacturer);
  const modelOptions = buildModelOptions(catalog, manufacturer, model);

  const Field = ({ id, label, children }) => (
    <div className={fieldClassName} style={fieldStyle}>
      <label className={labelClassName} style={labelStyle} htmlFor={id}>{label}</label>
      {children}
    </div>
  );

  return (
    <>
      <Field id={manufacturerId} label="Marque">
        <select
          id={manufacturerId}
          className={inputClassName}
          style={inputStyle}
          value={manufacturer ?? ""}
          onChange={(e) => onManufacturerChange(e.target.value)}
        >
          <option value="">-</option>
          {brandOptions.map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
      </Field>
      <Field id={modelId} label="Modèle">
        <select
          id={modelId}
          className={inputClassName}
          style={inputStyle}
          value={model ?? ""}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={!manufacturer}
        >
          <option value="">-</option>
          {modelOptions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </Field>
    </>
  );
}
