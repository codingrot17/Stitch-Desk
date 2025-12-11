import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMeasurementsStore = defineStore('measurements', () => {
  const measurements = ref(JSON.parse(localStorage.getItem('measurements')) || [])

  const defaultFields = [
    { key: 'chest', label: 'Chest', unit: 'in' },
    { key: 'waist', label: 'Waist', unit: 'in' },
    { key: 'hips', label: 'Hips', unit: 'in' },
    { key: 'shoulder', label: 'Shoulder', unit: 'in' },
    { key: 'sleeveLength', label: 'Sleeve Length', unit: 'in' },
    { key: 'armHole', label: 'Arm Hole', unit: 'in' },
    { key: 'neckSize', label: 'Neck Size', unit: 'in' },
    { key: 'backLength', label: 'Back Length', unit: 'in' },
    { key: 'frontLength', label: 'Front Length', unit: 'in' },
    { key: 'inseam', label: 'Inseam', unit: 'in' },
    { key: 'outseam', label: 'Outseam', unit: 'in' },
    { key: 'thigh', label: 'Thigh', unit: 'in' },
    { key: 'knee', label: 'Knee', unit: 'in' },
    { key: 'calf', label: 'Calf', unit: 'in' },
    { key: 'ankle', label: 'Ankle', unit: 'in' }
  ]

  const totalMeasurements = computed(() => measurements.value.length)

  function saveToStorage() {
    localStorage.setItem('measurements', JSON.stringify(measurements.value))
  }

  function addMeasurement(measurement) {
    const newMeasurement = {
      id: Date.now().toString(),
      ...measurement,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    measurements.value.push(newMeasurement)
    saveToStorage()
    return newMeasurement
  }

  function updateMeasurement(id, updates) {
    const index = measurements.value.findIndex(m => m.id === id)
    if (index !== -1) {
      measurements.value[index] = {
        ...measurements.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      return measurements.value[index]
    }
    return null
  }

  function deleteMeasurement(id) {
    const index = measurements.value.findIndex(m => m.id === id)
    if (index !== -1) {
      measurements.value.splice(index, 1)
      saveToStorage()
      return true
    }
    return false
  }

  function getMeasurementById(id) {
    return measurements.value.find(m => m.id === id)
  }

  function getMeasurementsByCustomer(customerId) {
    return measurements.value.filter(m => m.customerId === customerId)
  }

  return {
    measurements,
    defaultFields,
    totalMeasurements,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    getMeasurementById,
    getMeasurementsByCustomer
  }
})
