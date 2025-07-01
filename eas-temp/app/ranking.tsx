import { ScrollView, Text, View, StyleSheet, Button } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '@/constants/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { useRouter } from 'expo-router';


export default function RankingScreen() {
  const { role, loading } = useAuth();
  const [rankings, setRankings] = useState<any[]>([]);
  const router = useRouter();


  useEffect(() => {
    const fetchStats = async () => {
      const snapshot = await getDocs(collection(db, 'coachStats'));
      const data = snapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => b.averageScore - a.averageScore);
      setRankings(data);
    };

    fetchStats();
  }, []);

  if (loading) return null;
  if (role !== 'coach') return <Redirect href="/athlete" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'black', padding: 20 }}>
        
      <Text style={styles.header}>🏆 Coach Leaderboard</Text>
<Button
  title="← Back to Dashboard"
  onPress={() => router.push('/coach')}
  color="#888"
/>

      {rankings.map((coach, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <Text style={styles.name}>{coach.name}</Text>
          <Text style={styles.detail}>Avg Score: {coach.averageScore.toFixed(2)}</Text>
          <Text style={styles.detail}>Sessions: {coach.totalSessions}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
  },
  rank: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: 'bold',
  },
  name: {
    color: '#a0c4ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detail: {
    color: '#ccc',
    marginTop: 4,
  },
});
