import { createContext } from 'react'

// Optional so consumers of the shared header outside these three roles stay unchanged.
const NotificationContext = createContext(null)

export default NotificationContext
