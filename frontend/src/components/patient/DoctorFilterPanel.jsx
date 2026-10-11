import React, { useMemo } from "react";
import { Search, Globe, Stethoscope, Layers, ShieldCheck, X } from "lucide-react";
import { COUNTRIES } from "../../utils/countries";
import "./doctorFilterPanel.css";

const DoctorFilterPanel = ({
  searchQuery,
  setSearchQuery,
  selectedCountry,
  setSelectedCountry,
  selectedSpecialty,
  setSelectedSpecialty,
  selectedCategory,
  setSelectedCategory,
  selectedVerification,
  setSelectedVerification,
  meta,
  totalDoctors,
  filteredCount,
  onReset
}) => {
  // Sort countries list: registered doctor countries first with counts, then rest alphabetically
  const orderedCountries = useMemo(() => {
    const metaCountriesMap = {};
    if (meta?.countries) {
      meta.countries.forEach((c) => {
        metaCountriesMap[c.country.toLowerCase()] = c.count;
      });
    }

    const registered = [];
    const others = [];

    COUNTRIES.forEach((c) => {
      const matchCount =
        metaCountriesMap[c.name.toLowerCase()] ||
        metaCountriesMap[c.code.toLowerCase()] ||
        0;
      if (matchCount > 0) {
        registered.push({ ...c, count: matchCount });
      } else {
        others.push(c);
      }
    });

    // Sort registered by count desc
    registered.sort((a, b) => b.count - a.count);
    // Sort others alphabetically
    others.sort((a, b) => a.name.localeCompare(b.name));

    return { registered, others };
  }, [meta]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedCountry) ||
    Boolean(selectedSpecialty) ||
    Boolean(selectedCategory) ||
    Boolean(selectedVerification);

  return (
    <div className="doctor-filter-panel">
      {/* Search Input Row */}
      <div className="dfp-search-row">
        <div className="dfp-search-input-wrap">
          <Search className="dfp-search-icon" size={18} />
          <input
            type="text"
            className="dfp-search-input"
            placeholder="Search by specialist name, hospital, medical specialty, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="dfp-clear-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4-Column Dropdowns Grid */}
      <div className="dfp-dropdowns-grid">
        {/* Country Selector */}
        <div className="dfp-select-group">
          <label className="dfp-select-label">
            <Globe size={13} /> Country
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="dfp-select"
          >
            <option value="">All Countries ({COUNTRIES.length})</option>
            {orderedCountries.registered.length > 0 && (
              <optgroup label="Countries with Registered Doctors">
                {orderedCountries.registered.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name} ({c.count})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Other Countries">
              {orderedCountries.others.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Specialty Selector */}
        <div className="dfp-select-group">
          <label className="dfp-select-label">
            <Stethoscope size={13} /> Specialty
          </label>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="dfp-select"
          >
            <option value="">
              All Specialties ({meta?.specialties?.length || 0})
            </option>
            {(meta?.specialties || []).map((s) => (
              <option key={s.specialty} value={s.specialty}>
                {s.specialty} ({s.count})
              </option>
            ))}
          </select>
        </div>

        {/* Clinical Category */}
        <div className="dfp-select-group">
          <label className="dfp-select-label">
            <Layers size={13} /> Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="dfp-select"
          >
            <option value="">
              All Categories ({meta?.categories?.length || 0})
            </option>
            {(meta?.categories || []).map((cat) => (
              <option key={cat.category} value={cat.category}>
                {cat.category} ({cat.count})
              </option>
            ))}
          </select>
        </div>

        {/* Verification Status */}
        <div className="dfp-select-group">
          <label className="dfp-select-label">
            <ShieldCheck size={13} /> Verification
          </label>
          <select
            value={selectedVerification}
            onChange={(e) => setSelectedVerification(e.target.value)}
            className="dfp-select"
          >
            <option value="">All Registrations</option>
            <option value="Verified">Verified Medical Registry</option>
            <option value="Historical">Historical Medical Pioneer</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips & Clear All */}
      <div className="dfp-chips-bar">
        <div className="dfp-count-banner">
          Showing <span className="dfp-count-highlight">{filteredCount}</span> of{" "}
          <span className="dfp-count-highlight">{totalDoctors}</span> specialists
        </div>

        {hasActiveFilters && (
          <div className="dfp-active-chips">
            <span className="dfp-chip-label">Active:</span>

            {selectedCountry && (
              <span className="dfp-chip">
                {selectedCountry}
                <button
                  className="dfp-chip-remove"
                  onClick={() => setSelectedCountry("")}
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedSpecialty && (
              <span className="dfp-chip">
                {selectedSpecialty}
                <button
                  className="dfp-chip-remove"
                  onClick={() => setSelectedSpecialty("")}
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedCategory && (
              <span className="dfp-chip">
                {selectedCategory}
                <button
                  className="dfp-chip-remove"
                  onClick={() => setSelectedCategory("")}
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedVerification && (
              <span className="dfp-chip">
                {selectedVerification}
                <button
                  className="dfp-chip-remove"
                  onClick={() => setSelectedVerification("")}
                >
                  <X size={12} />
                </button>
              </span>
            )}

            <button className="dfp-clear-all-btn" onClick={onReset}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorFilterPanel;
